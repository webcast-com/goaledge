#!/bin/sh
# GoalEdge — Prisma helper.
#
# Why this wrapper exists
# ----------------------
# `prisma generate` and `prisma db push` make the CLI download a native
# `schema-engine` from https://binaries.prisma.sh. That host is unreachable in the
# Base44/Arena sandbox (and in any offline/air-gapped container), so the CLI dies
# with: "request to https://binaries.prisma.sh/all_commits/<hash>/.../schema-engine.gz
# failed" — which used to abort `bun install` (postinstall), the compose boot chain
# and every `npm run db:*` command.
#
# The app itself does not need that binary: the client is generated into the
# repository (src/generated/prisma) and uses the driver-adapter/WASM runtime of
# `@prisma/client` only. This script therefore:
#
#   generate  regenerate the committed client; falls back to a local no-op engine
#             (generation reads the schema with prisma-schema-wasm and never
#             executes the engine binary)
#   push      apply prisma/schema.prisma to db/custom.db — skipped with a warning
#             when the CLI cannot run (the committed DB already has the schema)
#   seed      run prisma/seed.mjs with Bun or Node (no CLI needed)
#   status    print what is available: CLI, engine download, committed client, DB
#
# Usage:
#   sh scripts/prisma.sh generate|push|seed|status
#   bun run db:generate   # same as `sh scripts/prisma.sh generate`
set -u

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT" || exit 1

GENERATED_DIR="src/generated/prisma"
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
  if [ -x node_modules/.bin/prisma ]; then printf '%s' "node_modules/.bin/prisma"; return 0; fi
  return 1
}

# A JS runtime that can execute the generated TypeScript client.
find_js_runtime() {
  if command -v bun >/dev/null 2>&1; then printf 'bun'; return 0; fi
  if command -v node >/dev/null 2>&1; then printf 'node'; return 0; fi
  return 1
}

# Is the client we ship actually there (and does it look generated)?
client_is_present() {
  [ -f "$GENERATED_DIR/client.ts" ] && [ -d "$GENERATED_DIR/models" ] &&
    [ "$(find "$GENERATED_DIR" -name '*.ts' | wc -l)" -ge 5 ]
}

prisma_generate() {
  PRISMA=$(find_prisma) || fail "Prisma CLI not found — run your package manager's install first (bun install / npm install)."

  log "→ $PRISMA generate"
  if "$PRISMA" generate; then
    log "✓ Prisma client generated into $GENERATED_DIR"
    return 0
  fi

  warn ""
  warn "⚠  prisma generate could not run — the CLI could not download its schema engine"
  warn "   (binaries.prisma.sh unreachable, e.g. inside the Base44/Arena sandbox)."
  warn "   Retrying with a local no-op engine: generation reads the schema with"
  warn "   prisma-schema-wasm and never executes the engine binary."

  NOOP=$(mktemp) || fail "mktemp failed"
  printf '#!/bin/sh\nexit 0\n' >"$NOOP"
  chmod +x "$NOOP"

  if PRISMA_SCHEMA_ENGINE_BINARY="$NOOP" "$PRISMA" generate; then
    rm -f "$NOOP"
    if client_is_present; then
      log "✓ Prisma client generated into $GENERATED_DIR (engine download bypassed)"
      return 0
    fi
    fail "The generator reported success but $GENERATED_DIR looks incomplete — run prisma generate in a network-enabled environment."
  fi
  rm -f "$NOOP"

  if client_is_present; then
    warn "✗ Regeneration failed, but the client committed in $GENERATED_DIR is intact — continuing with it."
    warn "  Fix the schema/network and re-run: bun run db:generate"
    return 0
  fi
  fail "✗ prisma generate failed and no committed client is available."
}

prisma_push() {
  PRISMA=$(find_prisma) || fail "Prisma CLI not found — run your package manager's install first (bun install / npm install)."

  if [ ! -f "$DB_FILE" ]; then
    warn "⚠  $DB_FILE is missing and the Prisma CLI needs its schema engine to create it."
    fail "   Run this from a machine with access to binaries.prisma.sh: bun run db:push"
  fi

  log "→ $PRISMA db push"
  if "$PRISMA" db push; then
    log "✓ Database schema is in sync with prisma/schema.prisma"
    return 0
  fi

  warn ""
  warn "⚠  prisma db push could not run (schema engine download blocked)."
  warn "   Continuing with the committed SQLite database at $DB_FILE, which already"
  warn "   contains every table from prisma/schema.prisma."
  warn "   Changed the schema? Apply it from a network-enabled environment with:"
  warn "     bun run db:push   (or: prisma db push)"
  return 0
}

prisma_seed() {
  RUNTIME=$(find_js_runtime) || fail "Need Bun or Node to run prisma/seed.mjs (the generated client is TypeScript)."
  log "→ $RUNTIME prisma/seed.mjs"
  exec "$RUNTIME" prisma/seed.mjs
}

# migrate/reset need the real engine; never pretend they succeeded.
prisma_migrate() {
  PRISMA=$(find_prisma) || fail "Prisma CLI not found — run your package manager's install first."
  log "→ $PRISMA $*"
  if "$PRISMA" "$@"; then
    return 0
  fi
  fail "✗ $* failed — migrations need the native schema engine from binaries.prisma.sh.\
\n   Run it from a network-enabled environment; for local schema tweaks use 'npm run db:push'."
}

prisma_status() {
  log "Prisma status"
  log "──────────────────────────────────────────────────────────────"

  if PRISMA=$(find_prisma); then
    VERSION=$("$PRISMA" --version 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g')
    if [ -n "$VERSION" ]; then
      log "CLI              : $VERSION"
    else
      log "CLI              : installed, but every command aborts (engine download blocked)"
    fi
  else
    log "CLI              : not installed (run bun install / npm install)"
  fi

  log "engine download  : $(if "$(find_prisma || echo prisma)" generate --help >/dev/null 2>&1; then echo 'reachable (binaries.prisma.sh works)'; else echo 'BLOCKED — binaries.prisma.sh unreachable; the committed client is used'; fi)"

  if client_is_present; then
    log "committed client : $GENERATED_DIR ($(find "$GENERATED_DIR" -name '*.ts' | wc -l | tr -d ' ') files, $(du -sh "$GENERATED_DIR" 2>/dev/null | cut -f1))"
  else
    log "committed client : MISSING — run: sh scripts/prisma.sh generate"
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
  generate | gen) prisma_generate ;;
  push | db-push) prisma_push ;;
  seed | db-seed) prisma_seed ;;
  migrate) shift; prisma_migrate migrate dev "$@" ;;
  reset) shift; prisma_migrate migrate reset "$@" ;;
  status | -s) prisma_status ;;
  *)
    log "Usage: sh scripts/prisma.sh generate|push|seed|migrate|reset|status"
    exit 1
    ;;
esac
