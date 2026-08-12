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

## Decide first, before any of it

1. **The product name.** Everything below depends on it.
2. **Whether the fork stays mergeable with upstream.** Renaming the
   `@open-mercato/*` packages makes pulling upstream fixes painful. There is a
   real choice here between *fully ours* and *able to take their security
   patches*, and it should be made deliberately rather than discovered.
3. **The public domain**, for links in emails and docs.

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
| Demo widget | *"Contact us"* feedback bubble | Gated by `DEMO_MODE`; see roadmap item 8 |
| Docs site | `apps/docs` is upstream's documentation | Either replace or drop |

*Add rows as they are noticed. Do not act on them yet.*
