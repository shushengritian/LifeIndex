import type {
  ActivitySession,
  Category,
  CompletedFocusSession,
  LifeIndexServices,
  RecordView,
  Snapshot,
  Transaction,
  WeightEntry,
} from '@/core/types'
import type { RecordKind } from '@/app/v4/Flow'

export type EditableRecord = Transaction | WeightEntry | ActivitySession | CompletedFocusSession
export interface RecordDraftSource {
  record: RecordView | null
  categories: Category[]
}
export async function readRecord(
  services: LifeIndexServices,
  kind: RecordKind,
  id: string,
): Promise<Snapshot<RecordDraftSource>> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // Entity and references must describe the same generation/revision before becoming an editor's captured source.
    const entityQuery =
      kind === 'transaction'
        ? services.transactions.getById(id)
        : kind === 'weight'
          ? services.weights.getById(id)
          : kind === 'activity'
            ? services.activities.getById(id)
            : kind === 'focus'
              ? services.focus.getById(id)
              : services.habits.getCheckById(id)
    const [entity, categories, habits] = await Promise.all([
      entityQuery,
      services.categories.list({ includeArchived: true }),
      services.habits.list(),
    ])
    if (
      [categories.stamp, habits.stamp].some(
        (stamp) =>
          stamp.generation !== entity.stamp.generation || stamp.revision !== entity.stamp.revision,
      )
    )
      continue
    const value = entity.data
    if (!value) return { stamp: entity.stamp, data: { record: null, categories: categories.data } }
    const category =
      'categoryId' in value ? categories.data.find((c) => c.id === value.categoryId) : undefined
    let record: RecordView
    if (kind === 'transaction' && 'amountMinor' in value && category)
      record = { kind, entity: value, category }
    else if (kind === 'weight' && 'weightGrams' in value) record = { kind, entity: value }
    else if (kind === 'activity' && 'durationMinutes' in value && category)
      record = { kind, entity: value, category }
    else if (kind === 'focus' && 'status' in value && value.status === 'completed')
      record = { kind, entity: value, ...(category ? { category } : {}) }
    else if (kind === 'habitCheck' && 'habitId' in value) {
      const habit = habits.data.find((h) => h.id === value.habitId)
      if (!habit)
        throw Object.assign(new Error('RecordReferenceUnavailable'), { code: 'ReadFailure' })
      record = { kind, entity: value, habit }
    } else throw Object.assign(new Error('RecordUnavailable'), { code: 'NotFound' })
    return { data: { record, categories: categories.data }, stamp: entity.stamp }
  }
  throw Object.assign(new Error('RecordSnapshotChanged'), { code: 'ReadFailure' })
}
