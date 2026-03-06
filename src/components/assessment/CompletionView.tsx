'use client';

import { useAssessment } from '@/context/AssessmentContext';

export default function CompletionView() {
  const { startAssessment } = useAssessment();

  return (
    <div className="completion-page" style={{ display: 'flex' }}>
      <div className="completion-icon">✓</div>
      <h2>评估完成！</h2>
      <p>正在生成您的评估报告...</p>
      <button
        className="btn-primary"
        onClick={startAssessment}
        style={{ marginTop: '24px' }}
      >
        重新评估
      </button>
    </div>
  );
}
