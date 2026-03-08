'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SwipeDirection } from '@/types';
import { questions } from '@/data/questions';
import SnakeProgress from './SnakeProgress';

const SWIPE_COMMIT_DELAY_MS = 140;
const QUICK_RESULT_TRIGGER_INDEX = 14;

interface CardStackProps {
  currentIndex: number;
  onSwipe: (direction: SwipeDirection) => void;
  onDragging: (direction: SwipeDirection | null) => void;
  onQuickResultRequested: () => void;
}

export default function CardStack({
  currentIndex,
  onSwipe,
  onDragging,
  onQuickResultRequested,
}: CardStackProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const swipeTimerRef = useRef<number | null>(null);
  const [slideClass, setSlideClass] = useState('');
  const [overlay, setOverlay] = useState<SwipeDirection | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const rafRef = useRef<number | null>(null);
  const lastOverlay = useRef<SwipeDirection | null>(null);

  const progress = (currentIndex / questions.length) * 100;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    dragState.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: 0,
      currentY: 0,
    };
    setIsDragging(true);
  }, []);

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragState.current.isDragging) return;

      const x = clientX - dragState.current.startX;
      const y = clientY - dragState.current.startY;

      dragState.current.currentX = x;
      dragState.current.currentY = y;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x / 20}deg)`;
        }

        let newOverlay: SwipeDirection | null = null;
        if (x > 50) newOverlay = 'right';
        else if (x < -50) newOverlay = 'left';
        else if (y < -50) newOverlay = 'up';
        else if (y > 50) newOverlay = 'down';

        if (newOverlay !== lastOverlay.current) {
          lastOverlay.current = newOverlay;
          setOverlay(newOverlay);
          onDragging(newOverlay);
        }
      });
    },
    [onDragging],
  );

  const handleEnd = useCallback(() => {
    if (!dragState.current.isDragging) return;

    const { currentX: x, currentY: y } = dragState.current;
    dragState.current.isDragging = false;
    setIsDragging(false);

    const commitSwipe = (direction: SwipeDirection, exitClass: string) => {
      setSlideClass(exitClass);
      setOverlay(null);
      onDragging(null);
      lastOverlay.current = null;

      if (swipeTimerRef.current) {
        window.clearTimeout(swipeTimerRef.current);
      }

      swipeTimerRef.current = window.setTimeout(() => {
        onSwipe(direction);
        if (currentIndex === QUICK_RESULT_TRIGGER_INDEX) {
          onQuickResultRequested();
        }
        setSlideClass('');
        if (cardRef.current) {
          cardRef.current.style.transform = '';
        }
      }, SWIPE_COMMIT_DELAY_MS);
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    if (x > 100 || (x > 30 && Math.abs(y) < 50)) {
      commitSwipe('right', 'slide-right');
    } else if (x < -100 || (x < -30 && Math.abs(y) < 50)) {
      commitSwipe('left', 'slide-left');
    } else if (y < -80) {
      commitSwipe('up', 'slide-up');
    } else if (y > 80) {
      commitSwipe('down', 'slide-down');
    } else {
      if (cardRef.current) {
        cardRef.current.style.transform = '';
      }
      setOverlay(null);
      onDragging(null);
      lastOverlay.current = null;
    }
  }, [currentIndex, onSwipe, onDragging, onQuickResultRequested]);

  useEffect(() => {
    dragState.current = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    };

    if (swipeTimerRef.current) {
      window.clearTimeout(swipeTimerRef.current);
      swipeTimerRef.current = null;
    }

    lastOverlay.current = null;

    if (cardRef.current) {
      cardRef.current.style.transform = '';
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

      event.preventDefault();
      const direction = event.key.replace('Arrow', '').toLowerCase() as SwipeDirection;
      onSwipe(direction);

      if (currentIndex === QUICK_RESULT_TRIGGER_INDEX) {
        onQuickResultRequested();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onSwipe, onQuickResultRequested]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      handleMove(event.touches[0].clientX, event.touches[0].clientY);
    };

    card.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      card.removeEventListener('touchmove', onTouchMove);
    };
  }, [handleMove, currentIndex]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (swipeTimerRef.current) {
        window.clearTimeout(swipeTimerRef.current);
      }
    };
  }, []);

  const cards = useMemo(() => {
    const result = [];

    for (let i = Math.min(2, questions.length - currentIndex - 1); i >= 0; i -= 1) {
      const qIndex = currentIndex + i;
      if (qIndex >= questions.length) continue;

      const question = questions[qIndex];
      const isTop = i === 0;

      result.push(
        <div
          key={question.id}
          ref={isTop ? cardRef : undefined}
          className={`card ${isDragging && isTop ? 'dragging' : ''} ${isTop ? slideClass : ''}`}
          style={{
            zIndex: 10 - i,
            transform: isTop ? undefined : `scale(${1 - i * 0.05}) translateY(${-i * 10}px)`,
            opacity: isTop ? 1 : 0.8,
            willChange: isTop ? 'transform' : undefined,
          }}
          onMouseDown={
            isTop
              ? (event) => {
                  event.preventDefault();
                  handleStart(event.clientX, event.clientY);
                }
              : undefined
          }
          onMouseMove={isTop ? (event) => handleMove(event.clientX, event.clientY) : undefined}
          onMouseUp={isTop ? handleEnd : undefined}
          onMouseLeave={isTop ? handleEnd : undefined}
          onTouchStart={
            isTop
              ? (event) => handleStart(event.touches[0].clientX, event.touches[0].clientY)
              : undefined
          }
          onTouchEnd={isTop ? handleEnd : undefined}
        >
          <span className="card-category">{question.category}</span>
          <div className="card-question">{question.question}</div>
          {question.desc && <div className="card-description">{question.desc}</div>}

          {isTop && (
            <>
              <div className={`card-overlay yes ${overlay === 'right' ? 'show' : ''}`}>
                <span className="card-overlay-icon">有明显表现</span>
              </div>
              <div className={`card-overlay no ${overlay === 'left' ? 'show' : ''}`}>
                <span className="card-overlay-icon">没有出现</span>
              </div>
              <div className={`card-overlay skip ${overlay === 'up' ? 'show' : ''}`}>
                <span className="card-overlay-icon">极严重</span>
              </div>
              <div className={`card-overlay uncertain ${overlay === 'down' ? 'show' : ''}`}>
                <span className="card-overlay-icon">不确定</span>
              </div>
            </>
          )}
        </div>,
      );
    }

    return result;
  }, [currentIndex, handleEnd, handleMove, handleStart, isDragging, overlay, slideClass]);

  return (
    <div>
      <div className="progress-container">
        <SnakeProgress currentIndex={currentIndex} total={questions.length} />
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">第 {currentIndex + 1} 题 / 共 {questions.length} 题</div>
      </div>

      <div className="card-container">{cards}</div>

      <div className="swipe-indicators">
        <div className="indicator">
          <div className="indicator-icon no">←</div>
          <span>没有</span>
        </div>
        <div className="indicator">
          <div className="indicator-icon skip">↑</div>
          <span>极严重</span>
        </div>
        <div className="indicator">
          <div className="indicator-icon uncertain">↓</div>
          <span>不确定</span>
        </div>
        <div className="indicator">
          <div className="indicator-icon yes">→</div>
          <span>有</span>
        </div>
      </div>

      <p className="helper-note">滑动卡片选择答案（键盘可用方向键）</p>
    </div>
  );
}
