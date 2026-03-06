'use client';

interface StartViewProps {
  onStart: () => void;
}

export default function StartView({ onStart }: StartViewProps) {
  return (
    <div className="start-page">
      <div className="start-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 4a3 3 0 0 0-3 3v1.2A2.8 2.8 0 0 0 4 11v2a3 3 0 0 0 3 3h.4A3.6 3.6 0 0 0 11 19h2a3.6 3.6 0 0 0 3.6-3H17a3 3 0 0 0 3-3v-2a2.8 2.8 0 0 0-2-2.8V7a3 3 0 0 0-3-3h-.6A3.6 3.6 0 0 0 11 2H9v2z"/>
          <path d="M9 8v8M15 8v8M12 8v8" opacity=".5"/>
        </svg>
      </div>
      <h2>ADHD 同步助手</h2>
      <p>通过滑动卡片快速记录您的症状</p>

      <div className="swipe-guide">
        <div className="yes">
          <span className="gesture-icon">→</span> 有这个症状
        </div>
        <div className="no">
          <span className="gesture-icon">←</span> 没有这个症状
        </div>
        <div className="skip">
          <span className="gesture-icon">↑</span> 极严重
        </div>
        <div className="skip">
          <span className="gesture-icon">↓</span> 不确定
        </div>
      </div>

      <button className="btn-primary" onClick={onStart}>开始评估</button>
    </div>
  );
}
