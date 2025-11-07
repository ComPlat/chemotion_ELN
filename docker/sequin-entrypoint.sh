#!/usr/bin/env bash
set -euo pipefail

# sequin-entrypoint.sh
# Generate development secrets if they are not provided in the environment.
# WARNING: This auto-generation is intended for development convenience only.
# DO NOT rely on this in production. In production provide VAULT_KEY and
# SECRET_KEY_BASE via a secrets manager or environment injection.

echo "[sequin-entrypoint] starting entrypoint"

if [ -z "${SECRET_KEY_BASE:-}" ]; then
  echo "[sequin-entrypoint] SECRET_KEY_BASE not set — generating a development secret (do NOT use in production)"
  export SECRET_KEY_BASE=$(openssl rand -hex 64)
fi

if [ -z "${VAULT_KEY:-}" ]; then
  echo "[sequin-entrypoint] VAULT_KEY not set — generating a development key (32 bytes, base64)"
  # generate 32 bytes, encode base64 (standard, with padding). Sequin expects base64 format.
  export VAULT_KEY=$(openssl rand -base64 32)
fi

if [ -z "${SENTRY_DSN:-}" ]; then
  # SENTRY_DSN is optional; leave empty for dev
  export SENTRY_DSN=""
fi

echo "[sequin-entrypoint] SECRET_KEY_BASE length: ${#SECRET_KEY_BASE} chars"
echo "[sequin-entrypoint] VAULT_KEY length: ${#VAULT_KEY} chars"

  # Ensure VAULT_KEY is properly base64-padded (length multiple of 4)
  pad_len=$(( ${#VAULT_KEY} % 4 ))
  if [ "$pad_len" -ne 0 ]; then
    # add '=' padding until length % 4 == 0
    while [ $(( ${#VAULT_KEY} % 4 )) -ne 0 ]; do
      VAULT_KEY="${VAULT_KEY}="
    done
    echo "[sequin-entrypoint] VAULT_KEY padded to length: ${#VAULT_KEY} chars"
  fi

# Exec the original start script that comes with the Sequin release.
exec /scripts/start_commands.sh "$@"
