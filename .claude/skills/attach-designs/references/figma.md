# Figma as the visual source

## Getting the file key

The key sits in the same position in every Figma URL shape, so a `/proto/` link from a
handoff message works exactly like a `/design/` link:

```
https://www.figma.com/design/<fileKey>/<slug>?node-id=<a-b>
https://www.figma.com/proto/<fileKey>/<slug>?node-id=<a-b>
https://www.figma.com/file/<fileKey>/<slug>
```

If the URL is `https://figma.com/design/:fileKey/branch/:branchKey/:name`, use the
**branchKey** as the fileKey - the branch is what the person is looking at.

## Node ids: two spellings

- **API calls** (`get_metadata`, `get_screenshot`): `123:456` with a colon
- **URLs** (the deep link you write into the ticket): `123-456` with a hyphen

Getting this backwards produces a link that opens the file at the wrong place, which
looks like it worked. Convert deliberately.

**Deep link template:**

```
https://www.figma.com/design/<fileKey>/<slug>?node-id=<a-b>
```

The slug can be anything (Figma redirects), but keep the real one so the link looks
native.

## Traversing the file

`get_metadata` with only `fileKey` and **no `nodeId`** returns the top-level pages as
guid + name. Start there - it is cheap and it tells you how the designer organised the
work.

Then pass a page guid as `nodeId` to get that page's subtree.

**A whole-page dump can be enormous.** Design files routinely have hundreds of nodes
per page. When a page comes back huge, do not try to hold it all: work from the
top-level frame names and positions in that XML, pick the handful of frames that
plausibly match the issues you have, and drill into those. You are looking for maybe 20
frames out of 400.

## Screenshots

`mcp__claude_ai_Figma__get_screenshot`:

- **Desktop frames** (~1366px wide): `maxDimension: 1400`. Below that, UI text in the
  frame stops being readable in the Linear description, which defeats the purpose.
- **Mobile frames** (~430px wide): the 1024 default is fine.

**Prefer the returned URL and `curl` it to disk** over `enableBase64Response`. Base64
burns far more context for the same pixels, and you need the file on disk anyway to get
its exact byte size for the Linear upload.

```bash
curl -sL "<returned url>" -o /tmp/.../ABC-12-modal-cierre.png
wc -c < /tmp/.../ABC-12-modal-cierre.png   # exact size for prepare_attachment_upload
```

Name the files after the issue and the view, not after the node id. You will be reading
this list back later.

## Frame names lie

This is the single most common source of wrong attachments. Real examples from a live
run in this workflow:

- A close-conversation modal named **"Ver Umbral P&L Diario"** - left over from a
  duplicated frame.
- A toast notification named **"cerrar consulta"** - named after the action that
  triggers it, not what it shows.

So: **never attach a frame on the strength of its name.** Pull the screenshot or the
text content and confirm it is the screen the ticket describes. Then write the node id
into the ticket, so the next person navigates by id instead of repeating your search.

## Discarded clusters

Designers park rejected work on the canvas rather than deleting it. It usually sits
under a text node acting as a banner - `NO VA`, `deprecated`, `v1 (no usar)`, `old` -
with a group of frames below it.

Skip those frames. But **say that you skipped them**, with the cluster's label and how
many frames it held, in the report's "Omitido" section. Two reasons: the user may know
that cluster is actually live, and a silent skip looks identical to not having looked.

When a frame is ambiguous - it is near a discard banner but not clearly under it - ask
rather than guess. One question is cheaper than a wrong pending line.
