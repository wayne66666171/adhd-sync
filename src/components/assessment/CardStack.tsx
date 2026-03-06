'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SwipeDirection } from '@/types';
import { questions } from '@/data/questions';
import SnakeProgress from './SnakeProgress';

const SWIPE_COMMIT_DELAY_MS = 140;

interface CardStackProps {
  currentIndex: number;
  onSwipe: (direction: SwipeDirection) => void;
  onDragging: (direction: SwipeDirection | null) => void;
}

export default function CardStack({ currentIndex, onSwipe, onDragging }: CardStackProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const swipeTimerRef = useRef<number | null>(null);
  const [slideClass, setSlideClass] = useState('');
  const [overlay, setOverlay] = useState<SwipeDirection | null>(null);

  // 使用 ref 存储拖拽状态，避免频繁重渲染
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // 用于强制更新卡片位置的状态
  const [, forceUpdate] = useState(0);

  // RAF 节流
  const rafRef = useRef<number | null>(null);
  const lastOverlay = useRef<SwipeDirection | null>(null);

  const progress = ((currentIndex) / questions.length) * 100;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    dragState.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: 0,
      currentY: 0,
    };
    forceUpdate(n => n + 1);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.current.isDragging) return;

    const x = clientX - dragState.current.startX;
    const y = clientY - dragState.current.startY;

    dragState.current.currentX = x;
    dragState.current.currentY = y;

    // 使用 RAF 节流更新
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      // 直接操作 DOM 更新 transform，避免 React 重渲染
      if (cardRef.current) {
        cardRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x / 20}deg)`;
      }

      // 计算 overlay 方向
      let newOverlay: SwipeDirection | null = null;
      if (x > 50) {
        newOverlay = 'right';
      } else if (x < -50) {
        newOverlay = 'left';
      } else if (y < -50) {
        newOverlay = 'up';
      } else if (y > 50) {
        newOverlay = 'down';
      }

      // 只在 overlay 变化时更新状态
      if (newOverlay !== lastOverlay.current) {
        lastOverlay.current = newOverlay;
        setOverlay(newOverlay);
        onDragging(newOverlay);
      }
    });
  }, [onDragging]);

  const handleEnd = useCallback(() => {
    if (!dragState.current.isDragging) return;

    const { currentX: x, currentY: y } = dragState.current;
    dragState.current.isDragging = false;

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
      // 重置卡片位置
      if (cardRef.current) {
        cardRef.current.style.transform = '';
      }
      setOverlay(null);
      onDragging(null);
      lastOverlay.current = null;
    }

    forceUpdate(n => n + 1);
  }, [onSwipe, onDragging]);

  // 当切换到下一题时，重置卡片状态
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
    setOverlay(null);
    setSlideClass('');
    lastOverlay.current = null;
    if (cardRef.current) {
      cardRef.current.style.transform = '';
    }
  }, [currentIndex]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as SwipeDirection;
        onSwipe(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwipe]);

  // 触摸事件处理 - 使用 passive: false 以便调用 preventDefault
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // 防止页面滚动
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    card.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      card.removeEventListener('touchmove', onTouchMove);
    };
  }, [handleMove, currentIndex]);

  // 清理 RAF
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

  const isDragging = dragState.current.isDragging;

  // 使用 useMemo 缓存卡片渲染
  const cards = useMemo(() => {
    const result = [];
    for (let i = Math.min(2, questions.length - currentIndex - 1); i >= 0; i--) {
      const qIndex = currentIndex + i;
      if (qIndex < questions.length) {
        const q = questions[qIndex];
        const isTop = i === 0;

        result.push(
          <div
            key={q.id}
            ref={isTop ? cardRef : undefined}
            className={`card ${isDragging && isTop ? 'dragging' : ''} ${isTop ? slideClass : ''}`}
            style={{
              zIndex: 10 - i,
              transform: isTop
                ? undefined // 由 JS 直接控制
                : `scale(${1 - i * 0.05}) translateY(${-i * 10}px)`,
              opacity: isTop ? 1 : 0.8,
              willChange: isTop ? 'transform' : undefined,
            }}
            onMouseDown={isTop ? (e) => {
              e.preventDefault();
              handleStart(e.clientX, e.clientY);
            } : undefined}
            onMouseMove={isTop ? (e) => handleMove(e.clientX, e.clientY) : undefined}
            onMouseUp={isTop ? handleEnd : undefined}
            onMouseLeave={isTop ? handleEnd : undefined}
            onTouchStart={isTop ? (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY) : undefined}
            onTouchEnd={isTop ? handleEnd : undefined}
          >
            <span className="card-category">{q.category}</span>
            <div className="card-question">{q.question}</div>
            {q.desc && <div className="card-description">{q.desc}</div>}

            {isTop && (
              <>
                <div className={`card-overlay yes ${overlay === 'right' ? 'show' : ''}`}>
                  <span className="card-overlay-icon">已记录</span>
                </div>
                <div className={`card-overlay no ${overlay === 'left' ? 'show' : ''}`}>
                  <span className="card-overlay-icon">未出现</span>
                </div>
                <div className={`card-overlay skip ${overlay === 'up' ? 'show' : ''}`}>
                  <span className="card-overlay-icon">极严重</span>
                </div>
                <div className={`card-overlay uncertain ${overlay === 'down' ? 'show' : ''}`}>
                  <span className="card-overlay-icon">不确定</span>
                </div>
              </>
            )}
          </div>
        );
      }
    }
    return result;
  }, [currentIndex, isDragging, slideClass, overlay, handleStart, handleMove, handleEnd]);

  return (
    <div>
      <div className="progress-container">
        <SnakeProgress currentIndex={currentIndex} total={questions.length} />
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">第 {currentIndex + 1} 题 / 共 {questions.length} 题</div>
      </div>

      <div className="card-container">
        {cards}
      </div>

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
