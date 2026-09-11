#!/bin/sh
# GoalEdge — Prisma Next (Prisma 8) helper.
#
# Why this wrapper exists
# ----------------------
# Prisma Next is contract-first: `src/prisma/contract.prisma` is compiled into
# `src/prisma/contract.json` + `contract.d.ts` by `prisma contract emit`, and the
# application queries the database through the façade in `src/prisma/db.ts`
# (the `@prisma/orm-sqlite` runtime). The compiled contract artefacts are
# committed, so the app boots without running the CLI at all.
#
# The CLI is pure JavaScript (no schema-engine download), so — unlike the Prisma
# 7 setup this replaced — emit/verify work in the Base44/Arena sandbox and in
# any offline container. `db init`/`db update` (DDL) also work here for SQLite
# because the target ships its own driver.
#
#   emit      compile the contract → src/prisma/contract.{json,d.ts}
#   verify    check the committed database against the contract
#   seed      run prisma/seed.mjs with Bun or Node (no CLI needed)
#   status    print CLI, contract artefact, database and runtime status
#   migrate   pass-through for `prisma migration …` (plan/status/log)
#   update    apply contract changes to the database (DDL) — see below
#
# Usage:
#   sh scripts/prisma.sh emit|verify|seed|status|migrate|update
#   bun run db:emit   # same as `sh scripts/prisma.sh emit`
set -u

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT" || exit 1

CONTRACT_DIR="src/prisma"
DB_FILE="db/custom.db"

log() { printf '%s\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# Locate the Prisma CLI: package-manager script PATH first, then node_modules.
find_prisma() {
  if [ -n "${PRISMA_BIN:-}" ]; then
    command -v "$PRISMA_BIN" >/dev/null 2>&1 && { printf '%s' "$PRISMA_BIN"; return 0; }
  fi
  if command -v prisma >/dev/null 2>&1; then printf 'prisma'; return 0; fi
  if [ -x node_modules/.bin/prisma ]; then printf '%s' 'node_modules/.bin/prisma'; return 0; fi
  return 1
}

# A JS runtime that can execute the TypeScript client (src/prisma/db.ts).
find_js_runtime() {
  if command -v bun >/dev/null 2>&1; then printf 'bun'; return 0; fi
  if command -v node >/dev/null 2>&1; then printf 'node'; return 0; fi
  return 1
}

contract_is_present() {
  [ -f "$CONTRACT_DIR/contract.prisma" ] &&
    [ -f "$CONTRACT_DIR/contract.json" ] &&
    [ -f "$CONTRACT_DIR/contract.d.ts" ]
}

prisma_emit() {
  PRISMA=$(find_prisma) || fail "Prisma CLI not found — run bun install / npm install first."

  log "→ $PRISMA contract emit"
  if "$PRISMA" contract emit; then
    if contract_is_present; then
      log "✓ Contract compiled into $CONTRACT_DIR (contract.json + contract.d.ts)"
      return 0
    fi
    fail "emit reported success but $CONTRACT_DIR/contract.json is missing."
  fi
  fail "✗ prisma contract emit failed — fix the contract diagnostics above."
}

prisma_verify() {
  PRISMA=$(find_prisma) || fail "Prisma CLI not found — run bun install / npm install first."
  log "→ $PRISMA db verify"
  "$PRISMA" db verify || fail "✗ Database does not match the contract (see diagnostics above)."
  log "✓ Database matches $CONTRACT_DIR/contract.prisma"
}

prisma_update() {
  PRISMA=$(find_prisma) || fail "Prisma CLI not found — run bun install / npm install first."
  if [ ! -f "$DB_FILE" ]; then
    fail "✗ $DB_FILE is missing — restore it from git before applying contract changes."
  fi
  warn "⚠  This applies contract changes (DDL) to $DB_FILE."
  warn "   Back the database up first: cp $DB_FILE $DB_FILE.bak"
  log "→ $PRISMA db update"
  "$PRISMA" db update || fail "✗ db update failed — see diagnostics above."
  log "✓ Database schema updated"
}

prisma_seed() {
  RUNTIME=$(find_js_runtime) || fail "Need Bun or Node to run prisma/seed.mjs (the client is TypeScript)."
  log "→ $RUNTIME prisma/seed.mjs"
  exec "$RUNTIME" prisma/seed.mjs
}

prisma_migrate() {
  PRISMA=$(find_prisma) || fail "Prisma CLI not found — run bun install / npm install first."
  log "→ $PRISMA migration $*"
  "$PRISMA" migration "$@" || fail "✗ prisma migration $* failed — see diagnostics above."
}

prisma_status() {
  log "Prisma status"
  log "──────────────────────────────────────────────────────────────"

  if PRISMA=$(find_prisma); then
    VERSION=$("$PRISMA" --version 2>/dev/null | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' | head -1)
    log "CLI              : prisma ${VERSION:-unknown} (@prisma/orm-sqlite $(node -p "require('./node_modules/@prisma/orm-sqlite/package.json').version" 2>/dev/null || echo '?'))"
  else
    log "CLI              : not installed (run bun install / npm install)"
  fi

  if contract_is_present; then
    log "contract         : $CONTRACT_DIR/contract.prisma ($(wc -c <"$CONTRACT_DIR/contract.json" | tr -d ' ') byte contract.json)"
  else
    log "contract         : MISSING — run: sh scripts/prisma.sh emit"
  fi

  if [ -f "$DB_FILE" ]; then
    log "database         : $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"
  else
    log "database         : $DB_FILE MISSING"
  fi

  if RUNTIME=$(find_js_runtime); then
    log "js runtime       : $RUNTIME $("$RUNTIME" --version 2>&1 | head -1)"
  else
    log "js runtime       : neither bun nor node found"
  fi
}

case "${1:-status}" in
  emit | generate | gen) prisma_emit ;;
  verify | status-db) prisma_verify ;;
  update | push | db-push) prisma_update ;;
  seed | db-seed) prisma_seed ;;
  migrate) shift; prisma_migrate "$@" ;;
  status | -s) prisma_status ;;
  *)
    log "Usage: sh scripts/prisma.sh emit|verify|update|seed|migrate|status"
    exit 1
    ;;
esac
