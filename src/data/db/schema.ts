export const CURRENT_DATABASE_VERSION = 3

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

// V3 only adds records: old stores and indexes remain byte-for-byte unchanged.
export const databaseSchemaV3 = {
  ...databaseSchemaV2,
  cessationPlans: 'id,startAt',
  cessationDays: 'id,&[planId+localDate],planId,localDate',
  cessationEvents: 'id,[planId+localDate],[planId+occurredAt],planId',
} as const
export const databaseStoreNames = Object.keys(databaseSchemaV3) as Array<
  keyof typeof databaseSchemaV3
>
