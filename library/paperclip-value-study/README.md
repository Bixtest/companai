# The Paperclip value study

**A second, wider pass over upstream Paperclip** — every functionality, code, idea, flow and concept —
asking one question: **is any of it worth taking, learning from, or deliberately rejecting for our
platform?**

**Read in this order:**

1. [`PLAN.md`](PLAN.md) — why the study exists, the rule it runs under, and the twelve batches.
2. [`LOG.md`](LOG.md) — one dated line per batch completed.
3. [`findings/07-synthesis.md`](findings/07-synthesis.md) — **the answer.** What is genuinely new to
   us, what we already have, and what we reject.

**If you read one thing, read the synthesis.** Its answer in one line: *yes, six things worth acting on,
and two of them are corrections to our own plan.* The six are the responsible-user intersection; the
`ML-4` wording correction; the orchestration boundary; the concurrency rules to write down before `AH-3`;
the self-modification gate; and the memory control plane. The **trap list** is the seventh thing and the
most useful, but it is not one of the six.

**This is not the first study.** [`../paperclip-hermes-study/`](../paperclip-hermes-study/) studied
Paperclip through one lens — how AI workers get roles, tasks, delegation, triggers and conversations —
and its synthesis is the reference for our agent architecture. **This study's lens is different:** the
whole product surface, scanned for value. Where the two overlap, this study cites the first rather than
re-deriving it.

**The rule:** document only where there is value. A finding that ends in "we already have this" is a
result, recorded in one line, not a recommendation.

**The tree studied:** `library/ai/paperclip-master/` (upstream Paperclip 0.3.1, MIT, 8,300 files),
extracted from `paperclip-master.zip`. It is **somebody else's code** — a reference tree, gitignored,
never ours to ship.

*Opened 2026-10-05 at the owner's request.*
