export const CURRENT_DATABASE_VERSION = 5

export const databaseSchemaV1 = {
  categories: 'id,[domain+archived],[domain+transactionType+archived],sortOrder,updatedAt',
  transactions: 'id,occurredAt,localDate,type,categoryId,[localDate+type],updatedAt',
  habits: 'id,status,startLocalDate,updatedAt',
  habitRecords: 'id,&[habitId+localDate],habitId,localDate,completedAt',
  focusSessions: 'id,status,startedAt,localDate,categoryId,updatedAt',
  settings: 'key,updatedAt',
  actionReceipts: 'actionId,actionType,handledAt,outcomeEntityId',
} as const

export const databaseSchemaV2 = {
  ...databaseSchemaV1,
  weightEntries: 'id,measuredAt,localDate,updatedAt',
  activitySessions: 'id,occurredAt,localDate,categoryId,intensity,updatedAt',
} as const

export const databaseSchema = {
  ...databaseSchemaV2,
  categories: `${databaseSchemaV2.categories},parentId`,
} as const
export const databaseStoreNames = Object.keys(databaseSchema) as Array<keyof typeof databaseSchema>
