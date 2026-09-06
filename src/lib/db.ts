import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// The bundled SQLite database, relative to the project root.
const LOCAL_DB_PATH = 'db/custom.db'

// prisma/schema.prisma declares a `sqlite` datasource and the client runs on the
// libSQL driver adapter, so only a `file:` URL can work. DATABASE_URL is written
// relative to the project root, so resolve it from process.cwd() (Prisma itself
// would resolve it relative to prisma/).
function sqliteUrl() {
  const raw = process.env.DATABASE_URL ?? `file:./${LOCAL_DB_PATH}`

  if (!raw.startsWith('file:')) {
    // A non-SQLite URL (e.g. a leftover Prisma Postgres connection string) makes
    // every query fail — sign-in included. Fall back to the bundled database and
    // say so loudly instead of 500-ing on every request.
    const scheme = raw.split(':')[0] || 'unknown'
    console.warn(
      `[db] DATABASE_URL uses an unsupported "${scheme}:" scheme for the sqlite ` +
        `datasource — falling back to file:./${LOCAL_DB_PATH}`
    )
    return `file:${process.cwd()}/${LOCAL_DB_PATH}`
  }

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
