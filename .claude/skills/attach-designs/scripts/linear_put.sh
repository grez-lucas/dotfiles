#!/usr/bin/env bash
# PUT a file to a Linear signed upload URL, sending every signed header verbatim.
#
# Usage:
#   linear_put.sh <file> <upload-request.json>
#   prepare_attachment_upload_output | linear_put.sh <file> -
#
# <upload-request.json> is the `uploadRequest` object returned by
# prepare_attachment_upload (or the whole response - either shape works):
#   { "url": "...", "headers": { "content-type": "image/png", ... } }
#
# Header casing is part of the signature: any header omitted or re-cased gives 403.
# The signed URL expires 60 seconds after prepare, so run this immediately and do one
# file end to end before preparing the next.

set -euo pipefail

FILE="${1:?usage: linear_put.sh <file> <upload-request.json|->}"
JSON_SRC="${2:?usage: linear_put.sh <file> <upload-request.json|->}"

[ -r "$FILE" ] || { echo "cannot read file: $FILE" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

if [ "$JSON_SRC" = "-" ]; then JSON=$(cat); else JSON=$(cat "$JSON_SRC"); fi

# Accept either the uploadRequest object or a response wrapping it.
REQ=$(printf '%s' "$JSON" | jq -c 'if has("uploadRequest") then .uploadRequest else . end')
URL=$(printf '%s' "$REQ" | jq -r '.url // empty')
[ -n "$URL" ] || { echo "no .url in upload request JSON" >&2; exit 1; }

# headers may be an object {k:v} or an array [{key,value}] depending on client shape.
mapfile -t HEADERS < <(printf '%s' "$REQ" | jq -r '
  (.headers // {})
  | if type == "array" then map("\(.key // .name): \(.value)")
    else to_entries | map("\(.key): \(.value)") end
  | .[]')

CURL_ARGS=(-sS -w '%{http_code}' -o /dev/null -X PUT --data-binary "@$FILE")
for h in "${HEADERS[@]}"; do CURL_ARGS+=(-H "$h"); done

CODE=$(curl "${CURL_ARGS[@]}" "$URL")

case "$CODE" in
  2*) echo "uploaded $FILE ($(wc -c < "$FILE") bytes) -> HTTP $CODE"; exit 0 ;;
  403) echo "HTTP 403 - the signed URL expired (60s) or a header/size was wrong." >&2
       echo "Re-run prepare_attachment_upload for a fresh URL; do not retry this one." >&2
       exit 1 ;;
  *)  echo "upload failed: HTTP $CODE" >&2; exit 1 ;;
esac
