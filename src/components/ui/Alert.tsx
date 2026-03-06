'use client';

interface AlertProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function Alert({ show, title, message, onClose, onConfirm }: AlertProps) {
  if (!show) return null;

  return (
    <div className={`alert ${show ? 'show' : ''}`} onClick={(e) => {
      if ((e.target as HTMLElement).classList.contains('alert')) onClose();
    }}>
      <div className="alert-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="alert-btns">
          <button className="alert-btn cancel" onClick={onClose}>取消</button>
          <button className="alert-btn danger" onClick={onConfirm}>确认</button>
        </div>
      </div>
    </div>
  );
}
