# Outside probe — is the model working, independent of the platform?

**Run 2026-10-06 07:46 (GMT+2), BEFORE any platform test.**
Order matters and was the owner's instruction: probe the model from OUTSIDE the platform first, so a
failure inside the platform can be attributed to the platform rather than the model.

## The probe

`POST http://127.0.0.1:8080/v1/chat/completions` — the model server directly, nothing of ours in the path.

- model: `/models/Qwen2.5-7B-Instruct-Q4_K_M.gguf`
- temperature: `0`, max_tokens: `400`
- system: the IR field list (same shape the agent declaration uses)
- user: *"list invoices over 10,000 EUR for each customer, newest first, at most 50"*

## Result — PASS

`http=200`, **32s** (prompt 12.1s / 162 tok, generation 19.3s / 73 tok ≈ 3.7 tok/s).

```json
{ "operation": "list", "entity": "invoice", "dimensions": ["customer"],
  "measures": [], "filters": [{"field": "amount", "operator": "gt", "value": 10000}],
  "sort": [{"field": "date", "direction": "desc"}], "limit": 50 }
```

Correct on every axis the request named: `list` (not `count`/`aggregate`), `customer` as the dimension,
`amount > 10000` as the filter, `date desc` as the sort, `limit: 50`.

## What this establishes, and what it does not

**Establishes:** the model server answers, the model produces an IR-shaped object for this request, and
the round trip works with no platform involvement. So **if the platform test fails, the fault is in the
platform**, not in the model or the model server. That is the whole point of running it first.

**Does NOT establish:** anything about quality of the *answer* — this is not a query result, and prose
quality is explicitly out of scope for now (the owner will later compare models and add commercial
OpenAI/Claude APIs). It is a **liveness and shape** check on the dependency, not an evaluation.

**Also not established:** speed in production terms — 32s on a quantised 7B on this laptop is a note for
the latency budget, not a defect.

## Server facts re-measured at probe time

- `GET /health` → `{"status":"ok"}`
- `GET /v1/models` → one model, `llamacpp`, `capabilities: ["completion"]`, format `gguf`
