#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash prompt.sh --sds-id <id> [--question "<text>"] [--send]

Required environment variables:
  KI_TOOLBOX_API_KEY          API token used as Authorization: Bearer <token>

Optional environment variables:
  KI_TOOLBOX_BASE_URL         Default: https://ki-toolbox.example.org
  KI_TOOLBOX_SDS_PATH         Default: /api/v1/sds/%s
  KI_TOOLBOX_CHAT_PATH        Default: /api/v1/chat/completions
  KI_TOOLBOX_MODEL            Default: gpt-4.1-mini
  CURL_CONNECT_TIMEOUT        Default: 10
  CURL_MAX_TIME               Default: 120
  CURL_RETRY                  Default: 2
USAGE
}

SDS_ID=""
QUESTION="Return the key safety and handling information as structured JSON."
SEND_REQUEST=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sds-id)
      SDS_ID="${2:-}"
      shift 2
      ;;
    --question)
      QUESTION="${2:-}"
      shift 2
      ;;
    --send)
      SEND_REQUEST=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$SDS_ID" ]]; then
  echo "Missing required argument: --sds-id" >&2
  usage
  exit 1
fi

if [[ -z "${KI_TOOLBOX_API_KEY:-}" ]]; then
  cat <<'EOF' >&2
Missing KI_TOOLBOX_API_KEY.
Example:
  export KI_TOOLBOX_API_KEY="<your_api_key>"
EOF
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but was not found in PATH." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but was not found in PATH." >&2
  exit 1
fi

KI_TOOLBOX_BASE_URL="${KI_TOOLBOX_BASE_URL:-https://ki-toolbox.example.org}"
KI_TOOLBOX_SDS_PATH="${KI_TOOLBOX_SDS_PATH:-/api/v1/sds/%s}"
KI_TOOLBOX_CHAT_PATH="${KI_TOOLBOX_CHAT_PATH:-/api/v1/chat/completions}"
KI_TOOLBOX_MODEL="${KI_TOOLBOX_MODEL:-gpt-4.1-mini}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-10}"
CURL_MAX_TIME="${CURL_MAX_TIME:-120}"
CURL_RETRY="${CURL_RETRY:-2}"

printf -v SDS_PATH "$KI_TOOLBOX_SDS_PATH" "$SDS_ID"
SDS_URL="${KI_TOOLBOX_BASE_URL}${SDS_PATH}"
CHAT_URL="${KI_TOOLBOX_BASE_URL}${KI_TOOLBOX_CHAT_PATH}"

COMMON_CURL_ARGS=(
  --silent
  --show-error
  --fail-with-body
  --connect-timeout "$CURL_CONNECT_TIMEOUT"
  --max-time "$CURL_MAX_TIME"
  --retry "$CURL_RETRY"
  --retry-delay 1
  --retry-connrefused
  -H "Accept: application/json"
  -H "Authorization: Bearer ${KI_TOOLBOX_API_KEY}"
)

echo "Fetching SDS JSON from: $SDS_URL" >&2
SDS_JSON="$(curl "${COMMON_CURL_ARGS[@]}" "$SDS_URL")"

if [[ -z "$SDS_JSON" ]]; then
  echo "SDS API returned an empty response." >&2
  exit 1
fi

if ! echo "$SDS_JSON" | jq -e . >/dev/null 2>&1; then
  echo "SDS API response is not valid JSON." >&2
  exit 1
fi

PAYLOAD="$(jq -cn \
  --arg model "$KI_TOOLBOX_MODEL" \
  --arg question "$QUESTION" \
  --arg sds_json "$(echo "$SDS_JSON" | jq -c .)" \
  '{
    model: $model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You extract structured data from Safety Data Sheets."
      },
      {
        role: "user",
        content: ("SDS JSON:\n" + $sds_json + "\n\nTask: " + $question)
      }
    ]
  }')"

echo "$PAYLOAD" | jq .

if [[ "$SEND_REQUEST" == true ]]; then
  echo "Sending chat completion request to: $CHAT_URL" >&2
  curl "${COMMON_CURL_ARGS[@]}" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "$PAYLOAD" \
    "$CHAT_URL" | jq .
fi
