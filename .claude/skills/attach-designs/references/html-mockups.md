# HTML mockups as the visual source

Teams usually have clickable HTML mockups before a Figma file exists, so this is a
first-class source, not a fallback. The difference from Figma is that you have to
*produce* the images yourself and you have to *reach* the state you want to capture.

## What is available in this environment

Verified working here (Linux, no display-dependent path needed):

```bash
npx -y playwright screenshot \
  --viewport-size=1366,900 --full-page --wait-for-timeout=500 \
  "file:///abs/path/to/copy.html" /abs/path/out.png
```

Playwright 1.63 resolves through `npx` and its Chromium is already in
`~/.cache/ms-playwright`. No project-local `node_modules` and no `npm install` needed -
which matters, because the mockups usually live in a folder that is not an npm project.

Two verified constraints:

- **`--device "iPhone 13"` does not work here.** The device presets force WebKit, which
  is not installed, and `-b chromium` does not override it. For mobile frames use a
  plain narrow viewport instead: `--viewport-size=430,932`.
- **There is no `--device-scale-factor` flag** on the CLI, so captures are 1x. At
  1366px wide that is still perfectly readable in a Linear description.

If `npx -y playwright screenshot --help` fails on a machine where this runs, say so
plainly and fall back to links-only rather than improvising another renderer. Nothing
else here renders HTML: there is no `chromium`/`google-chrome` on PATH, no
`wkhtmltoimage`, and the browser-extension automation path is not reliably present.

`scripts/capture_html.sh` (in this skill's directory) wraps the command above with the copy-and-inject step below.

## Never modify the original mockup

Copy the file to a working directory first and capture from the copy. The mockups are
usually the designer's or the front-end's working artefact, often not in git, and an
injected script left behind in the original is a genuinely nasty thing to hand back.

```bash
WORK=/tmp/.../attach-designs
mkdir -p "$WORK"
cp /path/to/mockup.html "$WORK/mockup.html"
```

Copy any sibling CSS/JS/image assets too, or keep the copy in the same directory under
a different name so relative paths still resolve. A screenshot of an unstyled page is
worse than no screenshot - it looks like the design is broken.

## Driving JS states

Mockups are usually single-page apps: one file holds a chat that advances turn by turn,
a modal that opens on click, a toast that appears after a timer. Screenshotting the
file as-is only ever captures the initial state, so most of the views the tickets need
are unreachable that way.

The reliable pattern is to **inject a tiny driver into the copy** that reads
`location.hash` and calls the page's *own* functions to reach the state, then capture
`file://...#state`. Driving the page through its own API is deterministic and keeps
working when the markup changes, which click-simulation does not.

1. Read the mockup and find the functions it already uses to change state -
   `showStep(3)`, `openModal('cierre')`, `setView('historial')`.
2. Append a driver to the **copy**, just before `</body>`:

```html
<script>
window.addEventListener('load', () => {
  const s = new URLSearchParams(location.hash.slice(1));
  // map each state name to the page's own calls
  if (s.has('modal'))  openModal(s.get('modal'));
  if (s.has('step'))   showStep(Number(s.get('step')));
  if (s.has('view'))   setView(s.get('view'));
});
</script>
```

3. Capture each state by URL:

```bash
npx -y playwright screenshot --viewport-size=1366,900 --full-page \
  --wait-for-timeout=600 "file://$WORK/mockup.html#step=3&modal=cierre" \
  "$WORK/ABC-14-modal-cierre.png"
```

Give the wait enough time for animations and timers to settle - 500-800ms is usually
right. If a state depends on a timed transition, `--wait-for-selector` on an element
that only exists in that state is more reliable than a longer timeout.

**Always look at the PNG you produced** before attaching it. A driver that silently
failed produces a valid screenshot of the wrong state, and that is outcome 1 recorded
for a view you never actually saw.

## Deep links for HTML mockups

There is no hosted URL to link to, so the "deep link" is the reproducible path to the
state: the mockup file path plus the state fragment. Put that in the ticket next to the
screenshot so the reader can reach it themselves:

```
Mockup: `mockups/soporte.html` (estado `#step=3&modal=cierre`)
```

If the team publishes the mockups anywhere (a static host, a PR preview, a Lavish
artifact), use that URL instead - a path on someone's laptop helps one person.
