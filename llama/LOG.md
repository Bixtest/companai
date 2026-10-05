# Work log

## 2026-10-05 — Initial documentation analysis

- Scope: assess llama-server integration for Companai using the prior Hermes/Starting Kit architecture, with documentation written only under `C:\Users\Ramzi\Downloads\companai\llama`.
- Confirmed the target `llama` directory did not exist before creating it.
- Read product AI-first architecture, Starting Kit development architecture, Sprint 0 runbook, blocker register, hybrid hosting review/plan, handover and supporting sibling Paperclip/Hermes/llama research.
- Checked official `ggml-org/llama.cpp` server and repository documentation for current API surface and caveats.
- Incorporated owner clarification: distinguish inference execution from runtime lifecycle management and product-native integration. Checked official Hermes local-model and custom-provider documentation; corrected the overbroad premise that Hermes cannot manage models.
- Documented the existing reported local inference path and its limitations; separated dated facts, upstream capabilities, recommendations and unresolved implementation questions.
- No source code, existing documents, model files, deployment configuration, services or databases were changed. No tests, benchmarks, or live service calls were run.
