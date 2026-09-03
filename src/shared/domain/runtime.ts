export interface Clock {
  now(): Date
}

export interface IdGenerator {
  next(): string
}

export const systemClock: Clock = {
  now: () => new Date(),
}

export const cryptoIdGenerator: IdGenerator = {
  next: () => globalThis.crypto.randomUUID(),
}
