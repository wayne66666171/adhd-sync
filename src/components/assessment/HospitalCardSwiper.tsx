'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SortedHospital } from '@/data/doctors';

interface HospitalCardSwiperProps {
  hospitals: SortedHospital[];
}

const SWIPE_THRESHOLD = 60;
const COMMIT_DELAY_MS = 200;

const PRIORITY_CONFIG = {
  local:  { label: '本地',     color: '#059669', bg: '#d1fae5' },
  nearby: { label: '邻近',     color: '#2563eb', bg: '#dbeafe' },
  far:    { label: '其他地区', color: '#64748b', bg: '#f1f5f9' },
};

export default function HospitalCardSwiper({ hospitals }: HospitalCardSwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideClass, setSlideClass] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    locked: false,
  });

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // 切卡时重置拖拽状态
  useEffect(() => {
    dragState.current = { isDragging: false, startX: 0, startY: 0, currentX: 0, locked: false };
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
      cardRef.current.style.transition = '';
    }
  }, [currentIndex]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    dragState.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: 0,
      locked: false,
    };
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const state = dragState.current;
    if (!state.isDragging) return;

    const dx = clientX - state.startX;
    const dy = clientY - state.startY;

    // 首次大幅移动：判断方向意图
    if (!state.locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      if (Math.abs(dy) > Math.abs(dx)) {
        // 竖直滚动意图 → 放弃拖拽
        state.isDragging = false;
        return;
      }
      state.locked = true;
    }

    if (!state.locked) return;

    state.currentX = dx;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rotate = dx / 25;
      const scale = 1 - Math.min(Math.abs(dx) / 800, 0.05);
      cardRef.current.style.transform = `translate3d(${dx}px, 0, 0) rotate(${rotate}deg) scale(${scale})`;
      cardRef.current.style.opacity = `${1 - Math.min(Math.abs(dx) / 400, 0.3)}`;
    });
  }, []);

  const commitSwipe = useCallback((direction: 'left' | 'right') => {
    const exitClass = direction === 'left' ? 'hospital-slide-left' : 'hospital-slide-right';
    setSlideClass(exitClass);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (direction === 'left') {
        setCurrentIndex((prev) => (prev + 1) % hospitals.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + hospitals.length) % hospitals.length);
      }
      setSlideClass('');
    }, COMMIT_DELAY_MS);
  }, [hospitals.length]);

  const handleEnd = useCallback(() => {
    const state = dragState.current;
    if (!state.isDragging && !state.locked) return;

    state.isDragging = false;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const x = state.currentX;

    if (x < -SWIPE_THRESHOLD) {
      commitSwipe('left');
    } else if (x > SWIPE_THRESHOLD) {
      commitSwipe('right');
    } else {
      // 弹回原位
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease';
        cardRef.current.style.transform = '';
        cardRef.current.style.opacity = '';
        setTimeout(() => {
          if (cardRef.current) cardRef.current.style.transition = '';
        }, 360);
      }
    }

    state.currentX = 0;
    state.locked = false;
  }, [commitSwipe]);

  // passive: false 阻止滑动时页面滚动
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onTouchMove = (e: TouchEvent) => {
      if (dragState.current.locked) e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    card.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => card.removeEventListener('touchmove', onTouchMove);
  }, [handleMove, currentIndex]);

  if (hospitals.length === 0) {
    return (
      <div className="hospital-swiper-empty">
        <div className="hospital-empty-icon">🏥</div>
        <p>暂无该地区及周边社群数据</p>
        <div className="hospital-fallback-links">
          <a href="https://www.haodf.com" target="_blank" rel="noopener noreferrer">好大夫在线</a>
          <a href="https://jk.jd.com" target="_blank" rel="noopener noreferrer">京东健康</a>
        </div>
      </div>
    );
  }

  const hospital = hospitals[currentIndex];
  const phoneClean = hospital.phone.replace(/[^\d]/g, '');
  const pConfig = PRIORITY_CONFIG[hospital.priority];

  return (
    <div className="hospital-swiper">
      <div className="hospital-swiper-counter">
        <span className="hospital-swiper-counter-current">{currentIndex + 1}</span>
        <span className="hospital-swiper-counter-sep">/</span>
        <span>{hospitals.length}</span>
      </div>

      <div className="hospital-card-touch-area">
        <div
          ref={cardRef}
          className={`hospital-card ${slideClass}`}
          style={{ cursor: 'grab', willChange: 'transform' }}
          onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); }}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleEnd}
        >
          <div className="hospital-card-badge" style={{ background: pConfig.bg, color: pConfig.color }}>
            {pConfig.label}
          </div>
          <div className="hospital-card-name">{hospital.hospital}</div>
          <div className="hospital-card-dept">{hospital.department}</div>
          <a href={`tel:${phoneClean}`} className="hospital-card-phone" onClick={(e) => e.stopPropagation()}>
            <span className="hospital-card-phone-icon">☎️</span>
            <span>{hospital.phone}</span>
          </a>
          <div className="hospital-card-city">📍 {hospital.city}</div>
          {hospital.notes && <div className="hospital-card-notes">{hospital.notes}</div>}
        </div>
      </div>

      <div className="hospital-swiper-dots">
        {hospitals.map((h, i) => (
          <span
            key={`${h.hospital}-${i}`}
            className={`hospital-dot${i === currentIndex ? ' active' : ''}`}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
      </div>

      <div className="hospital-swiper-hint">← 滑动切换 →</div>
      <div className="hospital-community-note">用户社群分享，仅供参考</div>
    </div>
  );
}
