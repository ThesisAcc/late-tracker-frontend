interface EmptyStateProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        0
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="button button--primary"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
