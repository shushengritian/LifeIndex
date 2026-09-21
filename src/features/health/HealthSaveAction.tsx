import { Icon } from '@/shared/ui/Icon'
import './health.css'

export function HealthSaveAction({
  formId,
  busy,
  label,
}: {
  formId: string
  busy: boolean
  label: string
}) {
  // Native form association preserves validation and the original guarded submit handler.
  return (
    <button
      form={formId}
      type="submit"
      className="icon-action button-primary"
      aria-label={busy ? `${label}，保存中` : label}
      aria-busy={busy}
      disabled={busy}
    >
      <Icon name="check" size={24} />
    </button>
  )
}
