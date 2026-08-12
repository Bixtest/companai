# White-labelling — every place the original shows through

**What this is.** A running list of everywhere the platform still says *Open
Mercato*, so that re-branding is one deliberate batch rather than an
archaeology project.

**The licence permits it.** Open Mercato is MIT, so a full re-brand is allowed.

**Not started, and not to be started piecemeal.** A half-rebranded product is
worse than an honest fork — mismatched names look like a security problem to
anybody evaluating it. This waits until the Starting Kit is finished and then
happens in one pass, with a name decided first.

**How this file is filled in.** By noticing in passing (COOKBOOK rule
zero-eight), not by a dedicated sweep. A sweep will happen once, at the start of
the batch, to catch what noticing missed.

---

## Assets we already have

`companai-logo/` at the project root — added by the owner 2026-08-11, committed
2026-08-12 so it has history and a backup like everything else here.

| File | Use |
|---|---|
| `companai.svg` | The master. Scales to any size |
| `companai.png` | 239 KB raster, for anywhere SVG is awkward |
| `companai.ico` | Browser tab / favicon |

A **C** formed from two figures — one with a solid head, one with a networked
sphere and circuit traces. A human and a machine making the same letter, which is
the product's thesis in one mark.

**Nothing has been applied yet**, deliberately — see the note above about not
re-branding piecemeal. When the batch runs, these replace the login mark, the tab
icon and the sidebar header first, because those are what an evaluator sees.

## Decided

**The product is called `Companai`.** Owner, 2026-08-12. Everything below now has
a target to rename to.

**The look is Mac/Apple.** Owner preference, and a useful constraint rather than
a vague one: generous whitespace, restrained colour, real hierarchy through type
and spacing instead of borders and boxes, soft depth over hard lines, motion that
is quick and never decorative. It should feel calm and expensive.

**Standing permissions, given 2026-08-12:**

- **Add any library, icon set, font or asset** that is genuinely unrestricted
  (MIT, Apache-2.0, ISC, BSD, CC0, SIL OFL for fonts) **and vendored into our own
  codebase** — nothing loaded from somebody else's CDN at runtime. Ask for
  anything that is not.
- **Decide what to hide or delete outright.** Named explicitly: the *"Feedback" /
  "Contact us"* bubble, which points at the upstream supplier and has no business
  in our product. That one is a deletion, not a setting.

## Still to decide

1. **Whether the fork stays mergeable with upstream.** Renaming the
   `@open-mercato/*` packages makes pulling upstream fixes painful. There is a
   real choice between *fully ours* and *able to take their security patches*,
   and it should be made deliberately rather than discovered.
   **My recommendation:** keep the package namespace for now and rename
   everything a user or evaluator can see. The internal names cost us nothing
   while upstream is still fixing bugs we would otherwise fix ourselves; the
   visible ones cost us the whole impression.
2. **The public domain**, for links in emails and docs.

---

## Found so far

| Where | What shows | Notes |
|---|---|---|
| Backend page title | `Open Mercato` in the browser tab | Seen on every backend page |
| Login screen | *"Open Mercato — Access your workspace"* | The first thing anybody sees |
| Footer | `Version 0.0.0-dev`, `Terms`, `Privacy` | Version string is also wrong for a release |
| Package names | `@open-mercato/*` across ~20 workspace packages | **This is the mergeability decision above** |
| CLI banner | `🧩 Open Mercato CLI` box, printed on every command | `packages/cli` |
| Repo/dirs | `open-mercato-main/`, `starting-kit/` paths, `.mercato/` generated dir | Cosmetic but pervasive |
| Env/config | `OM_*` env var prefix, `om_selected_org` cookie | Renaming cookies logs everybody out once |
| ~~Demo widget~~ | *"Contact us"* feedback bubble | **Removed 2026-08-12** — it was the visible half of U15, a public endpoint that emailed the vendor |
| Docs site | `apps/docs` is upstream's documentation | Either replace or drop |
| **Public legal pages** | `/privacy` and `/terms` tell readers to contact `info@openmercato.com` | **Do this first.** Legal pages are the one place a reader is entitled to assume the named party is who they are dealing with. Tracked as [U16](upstream-issues.md) |
| Checkout example seeds | `ops@`, `donations@`, `events@open-mercato.com` in `packages/checkout/seed/examples.ts` | Parked module; harmless until unparked |
| Default dashboard | Ships an **Example module** *Todos* widget — demo content on the admin start page | The `example` module is a demo module; consider parking it rather than hiding the widget |
| Dashboard/browser title | Every backend page's tab reads `Open Mercato` | Highest-visibility single string |

*Add rows as they are noticed. Do not act on them yet.*
