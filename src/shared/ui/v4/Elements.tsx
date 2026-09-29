import type { ReactNode } from 'react'

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}
export function SectionHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {children}
    </div>
  )
}
export function Feedback({
  kind,
  title,
  children,
  onRetry,
}: {
  kind: 'loading' | 'empty' | 'error'
  title: string
  children?: ReactNode
  onRetry?: () => void
}) {
  return (
    <div className={`feedback feedback--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <p>{title}</p>
      {children}
      {onRetry && (
        <button className="button secondary" type="button" onClick={onRetry}>
          重新读取
        </button>
      )}
    </div>
  )
}
export function Rosette({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" aria-hidden="true">
      {Array.from({ length: 12 }, (_, n) => (
        <ellipse
          key={n}
          cx="80"
          cy="80"
          rx="64"
          ry="25"
          transform={`rotate(${n * 15} 80 80)`}
          stroke="currentColor"
          strokeWidth="1.1"
        />
      ))}
    </svg>
  )
}
