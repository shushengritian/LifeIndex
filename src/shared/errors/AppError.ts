export type AppFailureClass =
  | 'Validation'
  | 'DatabaseInitialization'
  | 'DatabaseRead'
  | 'DatabaseWrite'
  | 'BackupExport'
  | 'BackupRead'
  | 'BackupVersion'
  | 'BackupIntegrity'
  | 'RestoreToken'
  | 'RestoreWrite'

export class AppError extends Error {
  constructor(
    readonly failureClass: AppFailureClass,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AppError'
  }
}
