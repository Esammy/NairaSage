# Global AI Hackathon Series with Qwen Cloud — Submission Notes

**Track: Agent Society** — NairaSage is a society of 13 specialist financial
agents (accountant, economist, investment advisor, tax advisor, behavioral
coach, debt manager, risk assessor, and more) coordinated by a routing agent
that decomposes each user question, runs up to 3 specialists **in parallel**,
and synthesizes one grounded answer — all on Qwen models running on Qwen Cloud.

## What was built during the hackathon submission period (after May 26, 2026)

NairaSage existed as an MVP before the hackathon. Everything below was designed
and implemented during the submission window:

### 1. Full migration to Qwen on Qwen Cloud
- **Tiered Qwen models** in [`backend/core/llm_factory.py`](../backend/core/llm_factory.py):
  routing + 12 specialists on `qwen-flash`, coach + synthesis on `qwen3-max`,
  via the OpenAI-compatible DashScope endpoint. New tiers: `get_coach_llm()`,
  `get_vision_llm()`, `get_thinking_llm()`.
- **RAG embeddings** migrated to `text-embedding-v4` at 1024 dims
  ([`backend/core/embeddings_factory.py`](../backend/core/embeddings_factory.py)),
  with a safe `--flush` re-embed path in the ingest command (mixed-model vector
  guard).
- **Capability smoke test** against the live endpoint:
  [`backend/scripts/qwen_smoke.py`](../backend/scripts/qwen_smoke.py)
  (completion, streaming, tool-calling round-trip, thinking deltas, embeddings).

### 2. Live agent-orchestration UI (the Agent Society, made visible)
- New SSE lifecycle events (`routing`, `agent_started`, `agent_finished`,
  `synthesis_started`, `tool_call`) emitted in real time from a
  queue-bridged parallel executor in
  [`backend/agents/coordinator.py`](../backend/agents/coordinator.py).
- [`AgentOrchestrationPanel`](../frontend/src/components/agent/AgentOrchestrationPanel.tsx)
  renders the routing decision, each specialist working in parallel
  (queued → running → done with per-agent latency), and the synthesis step —
  live, for every chat turn.

### 3. Deal Deep-Analysis with visible reasoning (`qwen3-235b-a22b-thinking-2507`)
- [`backend/apps/wealth/deal_analysis.py`](../backend/apps/wealth/deal_analysis.py)
  streams the thinking model over a deal + the user's Financial DNA + book RAG;
  the model's chain-of-thought streams to the UI ("Sage is thinking…"), ending
  with structured scores for all 10 Investor Controls that the user can apply
  to their checklist.

### 4. Statement/receipt scanning (`qwen3-vl-plus`)
- [`backend/apps/wealth/document_scan.py`](../backend/apps/wealth/document_scan.py):
  photo of a Nigerian bank statement → vision extraction → **confirm-before-write
  ActionProposals** (the model can only propose; the user must tap Confirm).
  Most Nigerian bank data arrives as PDFs/screenshots, not open-banking feeds —
  this is the realistic on-ramp.

### 5. Voice via Qwen ASR (`qwen3-asr-flash`)
- [`backend/apps/wealth/voice_transcribe.py`](../backend/apps/wealth/voice_transcribe.py)
  + push-to-talk recording in the browser (16 kHz WAV assembled client-side).
  Replaces the previous third-party STT vendor with Qwen Cloud.

### 6. Alibaba Cloud deployment
- Proof module: [`backend/integrations/alibaba_cloud.py`](../backend/integrations/alibaba_cloud.py)
  (raw DashScope chat + embeddings calls, OSS round-trip health check).
- [`docker-compose.yml`](../docker-compose.yml): Postgres with **pgvector**,
  Redis, gunicorn web, RQ worker, and Caddy auto-TLS — the stack that runs on
  the Alibaba Cloud ECS instance. Media storage on **Alibaba OSS** via its
  S3-compatible endpoint (`AWS_S3_ENDPOINT_URL`).

### 7. Measured efficiency vs single-agent (track requirement)
- [`backend/scripts/benchmark_agents.py`](../backend/scripts/benchmark_agents.py)
  blind-judges the multi-agent pipeline against a single monolithic prompt on
  10 Nigerian personal-finance questions; results in [`BENCHMARK.md`](BENCHMARK.md).

## Deployment topology

```
Browser ── Vercel (Next.js 16) ── HTTPS ── Caddy ── gunicorn/Django (ECS)
                                                 ├── Postgres 16 + pgvector (RAG)
                                                 ├── Redis 7 + RQ workers
                                                 ├── Alibaba OSS (document scans)
                                                 └── Qwen Cloud / DashScope
                                                     ├── qwen3-max (coach, synthesis)
                                                     ├── qwen-flash (routing, 12 specialists)
                                                     ├── qwen3-235b-a22b-thinking-2507 (deal analysis)
                                                     ├── qwen3-vl-plus (document scan)
                                                     ├── qwen3-asr-flash-2026-02-10 (voice)
                                                     └── text-embedding-v4 (RAG)
```
