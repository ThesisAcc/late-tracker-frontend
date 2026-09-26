interface LoadingStateProps {
  label: string
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-busy="true">
      <span className="loading-state__bar" />
      <span className="loading-state__bar loading-state__bar--wide" />
      <span className="loading-state__bar" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
