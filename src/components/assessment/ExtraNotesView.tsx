'use client';

import { useMemo } from 'react';

interface ExtraNotesViewProps {
  notes: string;
  onChange: (value: string) => void;
  onSkip: () => void;
  onSubmit: () => void;
}

const ADULT_SECTION_TITLE = '成年后补充';
const CHILD_SECTION_TITLE = '12岁前补充';

function parseNotes(notes: string) {
  const adultPrefix = `${ADULT_SECTION_TITLE}：`;
  const childPrefix = `${CHILD_SECTION_TITLE}：`;
  const sections = notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let adultNotes = '';
  let childNotes = '';

  sections.forEach((line) => {
    if (line.startsWith(adultPrefix)) {
      adultNotes = line.slice(adultPrefix.length).trim();
      return;
    }
    if (line.startsWith(childPrefix)) {
      childNotes = line.slice(childPrefix.length).trim();
      return;
    }
    if (!adultNotes) {
      adultNotes = line;
    }
  });

  return { adultNotes, childNotes };
}

function buildNotes(adultNotes: string, childNotes: string) {
  const parts: string[] = [];
  const normalizedAdult = adultNotes.trim();
  const normalizedChild = childNotes.trim();

  if (normalizedAdult) {
    parts.push(`${ADULT_SECTION_TITLE}：${normalizedAdult}`);
  }
  if (normalizedChild) {
    parts.push(`${CHILD_SECTION_TITLE}：${normalizedChild}`);
  }

  return parts.join('\n');
}

export default function ExtraNotesView({ notes, onChange, onSkip, onSubmit }: ExtraNotesViewProps) {
  const { adultNotes, childNotes } = useMemo(() => parseNotes(notes), [notes]);
  const hasContent = adultNotes.trim().length > 0 || childNotes.trim().length > 0;

  const handleAdultNotesChange = (value: string) => {
    onChange(buildNotes(value, childNotes));
  };

  const handleChildNotesChange = (value: string) => {
    onChange(buildNotes(adultNotes, value));
  };

  return (
    <div className="extra-notes-page">
      <div className="extra-notes-card">
        <h2>额外补充</h2>
        <p>如果您有其他成年后发生情况想补充的情况，可以在下方输入。</p>

        <textarea
          className="extra-notes-textarea"
          value={adultNotes}
          onChange={(e) => handleAdultNotesChange(e.target.value)}
          placeholder="例如：工作中经常难以持续专注，容易被打断..."
          rows={6}
        />

        <p>如果您有其他12岁前信息想补充的情况，可以在下方输入。</p>

        <textarea
          className="extra-notes-textarea"
          value={childNotes}
          onChange={(e) => handleChildNotesChange(e.target.value)}
          placeholder="例如：小学时常被老师提醒走神、作业经常漏做..."
          rows={6}
        />

        <div className="extra-notes-actions">
          <button type="button" className="extra-notes-skip" onClick={onSkip}>
            跳过
          </button>
          <button
            type="button"
            className={`extra-notes-submit ${hasContent ? 'active' : ''}`}
            onClick={onSubmit}
            disabled={!hasContent}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  );
}
