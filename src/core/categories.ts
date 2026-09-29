import { Engine, sameInput } from './database'
import { fail } from './errors'
import type { Category, CategoryScope, LifeIndexServices } from './types'
import {
  CATEGORY_SCOPES,
  normalizeCategoryName,
  oneOf,
  requireValue,
  uuid,
  validateCategoryInput,
} from './validation'

export function categoriesService(engine: Engine): LifeIndexServices['categories'] {
  const table = engine.db.categories
  const unique = async (scope: CategoryScope, normalized: string, except?: string) => {
    const candidates = await table.where('[scope+status]').equals([scope, 'active']).toArray()
    requireValue(
      !candidates.some((row) => row.id !== except && row.normalizedName === normalized),
      'name',
    )
  }
  const status =
    (next: 'active' | 'archived'): LifeIndexServices['categories']['archive'] =>
    (ref, ctx) =>
      engine.write(next === 'active' ? 'activate' : 'archive', ctx, async () => {
        const existing = await table.get(uuid(ref.id))
        if (!existing) fail('NotFound')
        if (existing.lastCommandId === ctx.commandId) return { data: existing, changed: false }
        engine.revision(existing, ref)
        if (existing.status === next) return { data: existing, changed: false }
        if (next === 'active') await unique(existing.scope, existing.normalizedName, existing.id)
        const entity: Category = { ...engine.changed(existing, ctx), status: next }
        await table.put(entity)
        return { data: entity, changed: true }
      })
  return {
    list: (options) =>
      engine.read(async () => {
        const scope =
          options.scope === undefined ? undefined : oneOf(options.scope, CATEGORY_SCOPES, 'scope')
        requireValue(typeof options.includeArchived === 'boolean')
        const rows = scope
          ? await table.where('scope').equals(scope).toArray()
          : await table.toArray()
        return rows
          .filter((row) => options.includeArchived || row.status === 'active')
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      }),
    create: (raw, ctx) =>
      engine.write('create', ctx, async (meta) => {
        const input = validateCategoryInput(raw),
          existing = await table.get(ctx.commandId)
        if (existing) {
          if (existing.lastCommandId !== ctx.commandId || !sameInput(existing, input))
            fail('EntityConflict')
          return { data: existing, changed: false }
        }
        engine.createGuard(meta, ctx)
        const normalizedName = normalizeCategoryName(input.name)
        await unique(input.scope, normalizedName)
        const rows = await table.where('scope').equals(input.scope).toArray()
        const entity: Category = {
          ...engine.base(ctx),
          ...input,
          normalizedName,
          status: 'active',
          sortOrder: rows.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0),
        }
        await table.add(entity)
        return { data: entity, changed: true }
      }),
    update: (ref, raw, ctx) =>
      engine.write('update', ctx, async () => {
        const input = validateCategoryInput(raw),
          existing = await table.get(uuid(ref.id))
        if (!existing) fail('NotFound')
        if (existing.lastCommandId === ctx.commandId) {
          if (!sameInput(existing, input)) fail('EntityConflict')
          return { data: existing, changed: false }
        }
        engine.revision(existing, ref)
        requireValue(input.scope === existing.scope, 'scope')
        if (sameInput(existing, input)) return { data: existing, changed: false }
        const normalizedName = normalizeCategoryName(input.name)
        if (existing.status === 'active') await unique(existing.scope, normalizedName, existing.id)
        const entity = { ...engine.changed(existing, ctx), ...input, normalizedName }
        await table.put(entity)
        return { data: entity, changed: true }
      }),
    archive: status('archived'),
    activate: status('active'),
    reorder: (scope, refs, ctx) =>
      engine.write('reorder', ctx, async () => {
        oneOf(scope, CATEGORY_SCOPES)
        const rows = await table.where('[scope+status]').equals([scope, 'active']).toArray()
        requireValue(
          refs.length === rows.length && new Set(refs.map((ref) => ref.id)).size === refs.length,
        )
        const byId = new Map(rows.map((row) => [row.id, row]))
        if (rows.every((row) => row.lastCommandId === ctx.commandId))
          return { data: rows.sort((a, b) => a.sortOrder - b.sortOrder), changed: false }
        if (refs.every((ref, index) => byId.get(ref.id)?.sortOrder === index)) {
          refs.forEach((ref) => {
            const row = byId.get(ref.id)
            requireValue(row)
            engine.revision(row, ref)
          })
          return { data: rows.sort((a, b) => a.sortOrder - b.sortOrder), changed: false }
        }
        const reordered = refs.map((ref, index) => {
          const row = byId.get(ref.id)
          requireValue(row)
          engine.revision(row, ref)
          return { ...engine.changed(row, ctx), sortOrder: index }
        })
        await table.bulkPut(reordered)
        return { data: reordered, changed: rows.length > 0 }
      }),
    removeUnused: (ref, ctx) =>
      engine.write<{ id: string; removed: boolean }>('remove', ctx, async () => {
        const row = await table.get(uuid(ref.id))
        if (!row) return { data: { id: ref.id, removed: false }, changed: false }
        engine.revision(row, ref)
        // Stable references survive archival; destructive removal is only valid for unreferenced categories.
        const references = await Promise.all([
          engine.db.transactions.where('categoryId').equals(ref.id).count(),
          engine.db.activitySessions.where('categoryId').equals(ref.id).count(),
          engine.db.focusSessions.where('categoryId').equals(ref.id).count(),
        ])
        requireValue(
          references.every((count) => count === 0),
          'categoryId',
        )
        await table.delete(ref.id)
        return { data: { id: ref.id, removed: true }, changed: true }
      }),
  }
}
