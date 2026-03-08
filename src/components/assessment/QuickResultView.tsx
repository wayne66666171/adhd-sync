'use client';

import { useMemo } from 'react';
import { questions } from '@/data/questions';
import { Responses } from '@/types';
import { QUICK_SCREENING_QUESTION_COUNT, calculateSuspicionPercentage } from '@/lib/diagnosis';

interface QuickResultViewProps {
  responses: Responses;
  onEvaluateNow: () => void;
  onContinue: () => void;
}

export default function QuickResultView({
  responses,
  onEvaluateNow,
  onContinue,
}: QuickResultViewProps) {
  const quickResponses = useMemo(() => {
    const scopedResponses: Responses = {};

    questions.slice(0, QUICK_SCREENING_QUESTION_COUNT).forEach((question) => {
      const answer = responses[question.id];
      if (answer) {
        scopedResponses[question.id] = answer;
      }
    });

    return scopedResponses;
  }, [responses]);

  const answeredCount = Object.keys(quickResponses).length;
  const suspicionPercent = useMemo(
    () => calculateSuspicionPercentage(quickResponses),
    [quickResponses],
  );

  return (
    <div className="quick-result-page">
      <div className="quick-result-card">
        <div className="quick-result-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 20h16" />
            <path d="M7 16V9" />
            <path d="M12 16V5" />
            <path d="M17 16v-3" />
          </svg>
        </div>

        <h2>阶段性筛查结果</h2>
        <p className="quick-result-subtitle">已完成 {answeredCount}/{QUICK_SCREENING_QUESTION_COUNT} 题</p>

        <div className="quick-result-percent">{suspicionPercent}%</div>
        <p className="quick-result-label">ADHD 疑似程度</p>

        <p className="quick-result-tip">建议做完整套题目，准确率会更高</p>

        <div className="quick-result-actions">
          <button type="button" className="quick-result-btn quick-result-btn-primary" onClick={onEvaluateNow}>
            立刻评估
          </button>
          <button type="button" className="quick-result-btn quick-result-btn-secondary" onClick={onContinue}>
            冲！继续做题！
          </button>
        </div>
      </div>
    </div>
  );
}
