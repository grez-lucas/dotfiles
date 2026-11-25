# Writing into Linear

## Edit with `patch`, never with `description`

`mcp__claude_ai_Linear__save_issue` takes a `patch` array of anchored operations applied
atomically - if one anchor fails, the whole save aborts and nothing is written. That
property is exactly what you want: a failed patch leaves the issue untouched, whereas a
`description` rewrite that drops a criterion succeeds silently.

Read the issue immediately before patching, and anchor on text you copied from that
read - not text you remember or reconstructed. Every anchor must match **exactly once**.

**Appending into an existing designs section:**

```json
{
  "id": "ABC-14",
  "patch": [
    {
      "op": "insert_after",
      "anchor": "## Diseños",
      "text": "\n\n- [Modal de cierre](https://www.figma.com/design/KEY/Soporte?node-id=482-1130) - node `482:1130`\n![Modal de cierre](https://uploads.linear.app/.../modal.png)"
    }
  ]
}
```

**Replacing a placeholder line** (the common case when the epic was created with
"Diseños: pendiente"):

```json
{
  "op": "replace",
  "old_string": "Diseños: pendiente",
  "new_string": "- [Modal de cierre](...) - node `482:1130`"
}
```

**When the issue has no designs section at all**, `insert_before` the heading that
should follow it in the house template, so the section lands in the right place rather
than at the bottom. If the template gives no clear position, `append` and say so.

Do not batch several issues into one call. One issue, one save, then verify.

## Uploading a screenshot

Verified sequence. The inline embed is what makes the image visible in the
description - `create_attachment_from_upload` only adds a row in the Attachments panel,
so it is optional and does not replace the embed.

**1. Prepare** - `mcp__claude_ai_Linear__prepare_attachment_upload`:

```
issue:       "ABC-14"
filename:    "ABC-14-modal-cierre.png"
contentType: "image/png"
size:        <exact bytes from `wc -c < file.png`>
```

A wrong `size` fails the PUT with 403, because the byte range is part of the signature.
Read it from the file; never estimate.

**2. PUT the raw bytes** to `uploadRequest.url`, sending **every** header from
`uploadRequest.headers` verbatim, casing included. Omitting or re-casing any signed
header returns 403.

```bash
<skill-dir>/scripts/linear_put.sh <file.png> <upload-request.json>
```

or by hand:

```bash
curl -sS -X PUT --data-binary @ABC-14-modal-cierre.png \
  -H "content-type: image/png" \
  -H "x-goog-content-length-range: 10589,10589" \
  -H "cache-control: public, max-age=31536000" \
  -H 'Content-Disposition: attachment; filename="ABC-14-modal-cierre.png"' \
  "<uploadRequest.url>"
```

Do not base64-encode or otherwise transform the file.

**3. Embed** the returned `assetUrl` inline in the patch: `![alt](assetUrl)`.

## The 60-second expiry

**The signed URL expires 60 seconds after `prepare_attachment_upload` returns.**

So: do one file **end to end** - prepare, PUT, embed - before preparing the next. Never
batch the prepare calls for several screenshots and then run the PUTs. This bites in a
very specific way: the first two uploads work, the fourth and fifth 403, and it looks
like a permissions problem rather than a timing one. It is timing.

If a PUT returns 403, re-run `prepare_attachment_upload` for a fresh URL rather than
retrying the expired one.

## Failure budget

Two failed upload attempts on one issue is the limit. Then:

- attach the deep link without the image,
- note in the designs section that the screenshot is pending,
- record the issue and the error in the report's failures list,
- move on.

The other issues in the epic are worth more than a third attempt at one image.

## Verify

After each save, `get_issue` and check:

- the designs section contains what you intended,
- the acceptance criteria and every other section are unchanged,
- the embedded image actually renders (the `assetUrl` is present in the body).

A patch that matched an unintended anchor produces a valid-looking save in the wrong
place. The re-read is what catches it.
