#!/usr/bin/env bash
set -euo pipefail

echo "[sequin-entrypoint] starting entrypoint"

# Start embedded Redis server
echo "[sequin-entrypoint] Starting embedded Redis server..."
redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --protected-mode no

# Wait for Redis to be ready
echo "[sequin-entrypoint] Waiting for Redis to be ready..."
for i in {1..30}; do
    if redis-cli ping > /dev/null 2>&1; then
        echo "[sequin-entrypoint] Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "[sequin-entrypoint] ERROR: Redis failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Handle Docker secrets or generate development keys
if [ -n "${SECRET_KEY_BASE_FILE:-}" ] && [ -f "${SECRET_KEY_BASE_FILE}" ]; then
    export SECRET_KEY_BASE=$(cat "${SECRET_KEY_BASE_FILE}")
    echo "[sequin-entrypoint] Loaded SECRET_KEY_BASE from secrets file"
elif [ -z "${SECRET_KEY_BASE:-}" ]; then
    echo "[sequin-entrypoint] SECRET_KEY_BASE not set — generating a development secret"
    export SECRET_KEY_BASE=$(openssl rand -hex 64)
fi

if [ -n "${VAULT_KEY_FILE:-}" ] && [ -f "${VAULT_KEY_FILE}" ]; then
    export VAULT_KEY=$(cat "${VAULT_KEY_FILE}")
    echo "[sequin-entrypoint] Loaded VAULT_KEY from secrets file"
elif [ -z "${VAULT_KEY:-}" ]; then
    echo "[sequin-entrypoint] VAULT_KEY not set — generating a development key"
    export VAULT_KEY=$(openssl rand -base64 32)
fi

if [ -n "${SENTRY_DSN_FILE:-}" ] && [ -f "${SENTRY_DSN_FILE}" ]; then
    export SENTRY_DSN=$(cat "${SENTRY_DSN_FILE}")
elif [ -z "${SENTRY_DSN:-}" ]; then
    export SENTRY_DSN=""
fi

# Load SEQUIN_ADMIN_PASSWORD for YAML interpolation
echo "[sequin-entrypoint] DEBUG: SEQUIN_ADMIN_PASSWORD_FILE=${SEQUIN_ADMIN_PASSWORD_FILE:-NOT_SET}"
if [ -n "${SEQUIN_ADMIN_PASSWORD_FILE:-}" ]; then
    echo "[sequin-entrypoint] DEBUG: File check for: ${SEQUIN_ADMIN_PASSWORD_FILE}"
    if [ -f "${SEQUIN_ADMIN_PASSWORD_FILE}" ]; then
        export SEQUIN_ADMIN_PASSWORD=$(cat "${SEQUIN_ADMIN_PASSWORD_FILE}")
        echo "[sequin-entrypoint] Loaded SEQUIN_ADMIN_PASSWORD from secrets file (length: ${#SEQUIN_ADMIN_PASSWORD})"
    else
        echo "[sequin-entrypoint] ERROR: SEQUIN_ADMIN_PASSWORD_FILE not found: ${SEQUIN_ADMIN_PASSWORD_FILE}"
    fi
else
    echo "[sequin-entrypoint] WARNING: SEQUIN_ADMIN_PASSWORD_FILE not set"
fi

echo "[sequin-entrypoint] SECRET_KEY_BASE length: ${#SECRET_KEY_BASE} chars"
echo "[sequin-entrypoint] VAULT_KEY length: ${#VAULT_KEY} chars"

# Ensure VAULT_KEY is properly base64-padded (length multiple of 4)
pad_len=$(( ${#VAULT_KEY} % 4 ))
if [ "$pad_len" -ne 0 ]; then
    while [ $(( ${#VAULT_KEY} % 4 )) -ne 0 ]; do
        VAULT_KEY="${VAULT_KEY}="
    done
    echo "[sequin-entrypoint] VAULT_KEY padded to length: ${#VAULT_KEY} chars"
fi

# Start Sequin (migrations, config loading, and server startup)
echo "[sequin-entrypoint] Starting Sequin..."
exec /scripts/start_commands.sh "$@"
