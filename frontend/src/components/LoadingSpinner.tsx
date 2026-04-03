interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

export function LoadingSpinner({ size = 'medium' }: LoadingSpinnerProps) {
  return (
    <div className={`spinner spinner--${size}`} role="status" aria-label="加载中">
      <div className="spinner__ring" />
      <span className="spinner__emoji">📖</span>
    </div>
  );
}
