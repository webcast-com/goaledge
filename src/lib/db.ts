import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// The local SQLite file lives at <repo>/db/custom.db. DATABASE_URL is written
// relative to the project root, so resolve it from process.cwd().
function sqliteUrl() {
  const raw = process.env.DATABASE_URL ?? 'file:./db/custom.db'
  if (!raw.startsWith('file:')) return raw
  const p = raw.slice('file:'.length)
  if (p.startsWith('/')) return `file:${p}`
  return `file:${process.cwd()}/${p.replace(/^\.\//, '')}`
}

const adapter = new PrismaLibSQL({ url: sqliteUrl() })

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
