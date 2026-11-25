#!/usr/bin/env bash
# Capture a state of an HTML mockup to PNG, without touching the original file.
#
# Usage:
#   capture_html.sh --src FILE --out PNG [--state FRAGMENT] [--driver JS_FILE]
#                   [--width N] [--height N] [--wait MS] [--selector SEL]
#                   [--workdir DIR]
#
#   --src       original mockup (never read-modified; its directory is never written to)
#   --out       output PNG path
#   --state     URL fragment appended after '#', e.g. "step=3&modal=cierre"
#   --driver    file holding a <script> body that reads location.hash and calls
#               the page's own functions; injected before </body> in the COPY
#   --width     viewport width  (default 1366; use 430 for mobile)
#   --height    viewport height (default 900;  use 932 for mobile)
#   --wait      ms to wait before capturing (default 600)
#   --selector  wait for this selector instead of / as well as the timeout
#   --workdir   scratch dir holding the mirrored mockup tree
#               (default: <dirname of --out>/.attach-designs-work)
#
# The whole mockup directory is mirrored into the workdir so relative CSS/JS/image
# paths still resolve, and the driver is injected into the mirror. The source tree is
# only ever read. The mirror is reused across captures and left in place, so a run that
# shoots twelve states copies the assets once.
#
# Note: playwright's --device presets need WebKit and are not usable here; a plain
# narrow viewport is the mobile path. Captures are 1x (no --device-scale-factor).

set -euo pipefail

SRC=""; OUT=""; STATE=""; DRIVER=""; WIDTH=1366; HEIGHT=900; WAIT=600; SELECTOR=""; WORKDIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --src)      SRC="$2"; shift 2 ;;
    --out)      OUT="$2"; shift 2 ;;
    --state)    STATE="$2"; shift 2 ;;
    --driver)   DRIVER="$2"; shift 2 ;;
    --width)    WIDTH="$2"; shift 2 ;;
    --height)   HEIGHT="$2"; shift 2 ;;
    --wait)     WAIT="$2"; shift 2 ;;
    --selector) SELECTOR="$2"; shift 2 ;;
    --workdir)  WORKDIR="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

[ -n "$SRC" ] && [ -n "$OUT" ] || { echo "--src and --out are required" >&2; exit 2; }
[ -r "$SRC" ] || { echo "cannot read source mockup: $SRC" >&2; exit 1; }

SRC=$(readlink -f "$SRC")
mkdir -p "$(dirname "$OUT")"
OUT=$(readlink -f "$OUT" 2>/dev/null || echo "$OUT")

# Mirror the mockup's whole directory so relative CSS/JS/image paths resolve, and so
# nothing is ever written next to the designer's original.
SRCDIR=$(dirname "$SRC")
BASE=$(basename "$SRC")
[ -n "$WORKDIR" ] || WORKDIR="$(dirname "$OUT")/.attach-designs-work"
mkdir -p "$WORKDIR"
WORKDIR=$(readlink -f "$WORKDIR")

# The mirror must not live inside the tree it mirrors, or the copy recurses into
# itself. This happens naturally when --out points inside the mockup folder.
case "$WORKDIR/" in
  "$SRCDIR"/*)
    WORKDIR="${TMPDIR:-/tmp}/attach-designs-$(printf '%s' "$SRCDIR" | cksum | cut -d' ' -f1)"
    mkdir -p "$WORKDIR"
    echo "note: workdir would sit inside the mockup tree; using $WORKDIR instead" >&2
    ;;
esac

# Anything we generate must stay out of the mirror, or each run copies the previous
# run's output back in and the tree nests one level deeper every time.
EXCLUDES=(--exclude=.attach-designs-work --exclude=.git)
PRUNE=(-name .attach-designs-work -prune -o -name .git -prune -o)
OUTDIR=$(readlink -f "$(dirname "$OUT")")
case "$OUTDIR/" in
  "$SRCDIR"/*)
    REL="${OUTDIR#"$SRCDIR"/}"
    EXCLUDES+=("--exclude=./$REL")
    PRUNE+=(-path "$OUTDIR" -prune -o)
    ;;
esac

# Re-mirror when anything in the source tree is newer than the last mirror.
if [ ! -e "$WORKDIR/$BASE" ] || \
   [ -n "$(find "$SRCDIR" "${PRUNE[@]}" -newer "$WORKDIR/$BASE" -print -quit 2>/dev/null)" ]; then
  rm -rf "${WORKDIR:?}/"* 2>/dev/null || true
  ( cd "$SRCDIR" && tar -cf - "${EXCLUDES[@]}" . ) | ( cd "$WORKDIR" && tar -xf - )
  chmod -R u+w "$WORKDIR"
fi

COPY="$WORKDIR/$BASE"
# Re-copy the page itself each run so a previous driver injection never stacks up.
cp "$SRC" "$COPY"

if [ -n "$DRIVER" ]; then
  [ -r "$DRIVER" ] || { echo "cannot read driver: $DRIVER" >&2; exit 1; }
  python3 - "$COPY" "$DRIVER" <<'PY'
import sys
copy_path, driver_path = sys.argv[1], sys.argv[2]
html = open(copy_path, encoding='utf-8').read()
body = open(driver_path, encoding='utf-8').read()
tag = '<script>\n' + body + '\n</script>\n'
lower = html.lower()
i = lower.rfind('</body>')
html = (html[:i] + tag + html[i:]) if i != -1 else (html + tag)
open(copy_path, 'w', encoding='utf-8').write(html)
PY
fi

URL="file://$COPY"
[ -n "$STATE" ] && URL="$URL#$STATE"

ARGS=(screenshot --viewport-size="$WIDTH,$HEIGHT" --full-page --wait-for-timeout="$WAIT")
[ -n "$SELECTOR" ] && ARGS+=(--wait-for-selector "$SELECTOR")

npx -y playwright "${ARGS[@]}" "$URL" "$OUT" >/dev/null

[ -s "$OUT" ] || { echo "capture produced no file: $OUT" >&2; exit 1; }
echo "$OUT $(wc -c < "$OUT") bytes"
echo "LOOK AT THIS PNG before attaching it - a driver that failed silently still produces a valid image of the wrong state." >&2
