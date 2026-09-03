export const CURRENT_DATABASE_VERSION = 1

export const databaseSchemaV1 = {
  categories: 'id,[domain+archived],[domain+transactionType+archived],sortOrder,updatedAt',
  transactions: 'id,occurredAt,localDate,type,categoryId,[localDate+type],updatedAt',
  habits: 'id,status,startLocalDate,updatedAt',
  habitRecords: 'id,&[habitId+localDate],habitId,localDate,completedAt',
  focusSessions: 'id,status,startedAt,localDate,categoryId,updatedAt',
  settings: 'key,updatedAt',
  actionReceipts: 'actionId,actionType,handledAt,outcomeEntityId',
} as const

export const databaseStoreNames = Object.keys(databaseSchemaV1) as Array<
  keyof typeof databaseSchemaV1
>
