'use client';

import { ImpactLevel } from '@/types';

interface ImpactPickerProps {
  onSelect: (level: ImpactLevel) => void;
}

export default function ImpactPicker({ onSelect }: ImpactPickerProps) {
  return (
    <div className="impact-picker">
      <div className="impact-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 20h16"/>
          <path d="M7 16V9"/>
          <path d="M12 16V5"/>
          <path d="M17 16v-3"/>
        </svg>
      </div>
      <h2>这些问题对你的生活影响有多大？</h2>

      <div className="impact-option" onClick={() => onSelect('mild')}>
        <span className="impact-mark mild"></span>
        <span>轻微</span>
      </div>
      <div className="impact-option" onClick={() => onSelect('moderate')}>
        <span className="impact-mark moderate"></span>
        <span>中等</span>
      </div>
      <div className="impact-option" onClick={() => onSelect('severe')}>
        <span className="impact-mark severe"></span>
        <span>严重</span>
      </div>
      <div className="impact-option" onClick={() => onSelect('verySevere')}>
        <span className="impact-mark very-severe"></span>
        <span>极严重</span>
      </div>
    </div>
  );
}
