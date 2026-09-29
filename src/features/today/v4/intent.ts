import type { RefObject } from 'react'
import type { CommandContext, Stamp } from '@/core/types'
import { commandContext } from '@/shared/v4/format'

export interface WriteIntent {
  signature: string
  context: CommandContext
}
export function retainedIntent(
  ref: RefObject<WriteIntent | null>,
  signature: string,
  stamp: Stamp,
): CommandContext {
  // A retry keeps its command identity and origin stamp. Signatures stay in memory and are never logged.
  if (!ref.current || ref.current.signature !== signature)
    ref.current = { signature, context: commandContext(stamp) }
  return ref.current.context
}
