import { createMemoryRepo } from './memoryRepo'
import { createSqlServerRepo } from './sqlServerRepo'
import type { Repo } from './types'

export type { Repo } from './types'

export function createRepo(): Repo {
  return process.env.STORAGE === 'memory' ? createMemoryRepo() : createSqlServerRepo()
}
