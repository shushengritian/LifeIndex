export const CURRENT_DATABASE_VERSION = 2

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

export const databaseStoreNames = Object.keys(databaseSchemaV2) as Array<
  keyof typeof databaseSchemaV2
>
