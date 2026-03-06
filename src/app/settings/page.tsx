'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearRecords } from '@/lib/storage';
import { useAssessment } from '@/context/AssessmentContext';
import Alert from '@/components/ui/Alert';

export default function SettingsPage() {
  const router = useRouter();
  const { resetAssessment } = useAssessment();
  const [showAlert, setShowAlert] = useState(false);

  const handleReset = () => {
    clearRecords();
    resetAssessment();
    setShowAlert(false);
    router.push('/');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>设置</h1>
      </div>

      <div className="settings-section">
        <h3>数据</h3>
        <div className="settings-list">
          <div className="settings-item danger" onClick={() => setShowAlert(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1,4 1,10 7,10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            <span>重置所有数据</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>关于</h3>
        <div className="app-info">
          <span className="app-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 4a3 3 0 0 0-3 3v1.2A2.8 2.8 0 0 0 4 11v2a3 3 0 0 0 3 3h.4A3.6 3.6 0 0 0 11 19h2a3.6 3.6 0 0 0 3.6-3H17a3 3 0 0 0 3-3v-2a2.8 2.8 0 0 0-2-2.8V7a3 3 0 0 0-3-3h-.6A3.6 3.6 0 0 0 11 2H9v2z"/>
            </svg>
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>ADHD 同步助手</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>v1.0.0</div>
          </div>
        </div>
        <div className="settings-list">
          <div className="settings-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>为ADHD而做</span>
          </div>
        </div>
      </div>

      <div className="tips-section">
        <h3>使用提示</h3>
        <div className="tip-row"><span className="gesture-icon">→</span> 表示有这个症状</div>
        <div className="tip-row"><span className="gesture-icon">←</span> 表示没有这个症状</div>
        <div className="tip-row"><span className="gesture-icon">↑</span> 表示极严重</div>
        <div className="tip-row"><span className="gesture-icon">↓</span> 表示不确定</div>
      </div>

      <Alert
        show={showAlert}
        title="重置数据"
        message="确定要重置所有数据吗？这将删除所有历史记录。"
        onClose={() => setShowAlert(false)}
        onConfirm={handleReset}
      />
    </div>
  );
}
