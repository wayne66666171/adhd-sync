'use client';

interface ExtraNotesViewProps {
  notes: string;
  onChange: (value: string) => void;
  onSkip: () => void;
  onSubmit: () => void;
}

export default function ExtraNotesView({ notes, onChange, onSkip, onSubmit }: ExtraNotesViewProps) {
  const hasContent = notes.trim().length > 0;

  return (
    <div className="extra-notes-page">
      <div className="extra-notes-card">
        <h2>额外补充</h2>
        <p>如果您有其他想补充的情况，可以在下方输入</p>

        <textarea
          className="extra-notes-textarea"
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例如：我从小学开始就经常被老师说注意力不集中..."
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
