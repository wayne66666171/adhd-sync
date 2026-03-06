'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessment } from '@/context/AssessmentContext';
import { loadRecords, saveRecords } from '@/lib/storage';
import { AssessmentRecord, durations } from '@/types';
import Alert from '@/components/ui/Alert';

export default function HistoryPage() {
  const router = useRouter();
  const { setViewingHistoryIndex } = useAssessment();
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const viewDetail = (index: number) => {
    setViewingHistoryIndex(index);
    router.push('/summary');
  };

  const clearHistory = () => {
    saveRecords([]);
    setRecords([]);
    setShowAlert(false);
  };

  const getSeverityClass = (severity: number): string => {
    if (severity <= 3) return 'mild';
    if (severity <= 6) return 'moderate';
    if (severity <= 8) return 'severe';
    return 'very-severe';
  };

  const getSeverityText = (severity: number): string => {
    if (severity <= 3) return '轻微';
    if (severity <= 6) return '中等';
    if (severity <= 8) return '严重';
    return '极严重';
  };

  return (
    <div className="container">
      <div className="header">
        <h1>历史记录</h1>
      </div>

      {records.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 4h8l2 2v14H6V6l2-2z"/>
              <path d="M9 10h6M9 14h6"/>
            </svg>
          </div>
          <h3>暂无历史记录</h3>
          <p>完成评估后，您的记录将显示在这里</p>
          <button className="empty-action" onClick={() => router.push('/')}>去做评估</button>
        </div>
      ) : (
        <>
          <div className="history-list">
            {records.map((r, index) => {
              const date = new Date(r.date);
              const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
              const severityLevel = getSeverityClass(r.severity);
              const severityText = getSeverityText(r.severity);
              const duration = durations.find(d => d.id === r.duration);

              return (
                <div
                  key={r.id}
                  className="history-item"
                  onClick={() => viewDetail(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="history-item-header">
                    <span className="history-date">{dateStr}</span>
                    <span className="history-severity">
                      <span className={`severity-dot ${severityLevel}`}></span>
                      {severityText}
                    </span>
                  </div>
                  <p className="history-summary">{r.summary}</p>
                  <div className="history-symptoms">
                    {r.symptoms.slice(0, 3).map((s, i) => (
                      <span key={i} className="history-symptom">{s.name}</span>
                    ))}
                    {r.symptoms.length > 3 && (
                      <span className="history-symptom">+{r.symptoms.length - 3}</span>
                    )}
                  </div>
                  {duration && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>{duration.text}</p>
                  )}
                </div>
              );
            })}
          </div>
          <button className="history-clear" onClick={() => setShowAlert(true)}>清空历史记录</button>
        </>
      )}

      <Alert
        show={showAlert}
        title="清空历史记录"
        message="确定要清空所有历史记录吗？此操作不可撤销。"
        onClose={() => setShowAlert(false)}
        onConfirm={clearHistory}
      />
    </div>
  );
}
