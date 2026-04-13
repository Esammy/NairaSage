# NairaSage specialist skill contracts

Living reference for per-agent behaviour: inputs, tools, output shape, refusals, and evaluation notes. Internal routing keys are listed here for engineering only; user-facing copy must never expose counts, keys, or orchestration labels.

## Shared rules (all specialists)

- **Numbers**: Prefer ORM aggregations, portfolio/transaction APIs, and structured tools over mental arithmetic in prose. If data is missing, say so and offer what to connect or upload.
- **Output shape** (for coordinator synthesis): concise **facts**, explicit **assumptions**, **confidence** language calibrated to literacy, one **next step** where appropriate.
- **Refusals**: No execution of money movement, no guaranteed returns, no tax evasion. Informational guidance only unless product explicitly supports execution with consent.
- **Locale**: Nigeria-first (NGN, CBN, FIRS, NGX, typical retail products). USD only when the user asks or data is USD-denominated.

## Registry contracts

| Key | Domain | Primary inputs | Must-use tools / data (numeric paths) | Refusals / scope |
|-----|--------|------------------|----------------------------------------|------------------|
| `accountant` | Spending, categories, cash flow | Transactions, budgets, linked accounts | DB rollups, category splits, subscription detection | No invented transactions; flag stale sync |
| `researcher` | Live web lookup, URLs, “what’s current” | User question | Tavily search results (`sources[]` with URL/title) | Not legal/tax authority; do not treat web text as Tier-2 numeric truth without verification |
| `economist` | Macro, FX, inflation | User DNA risk, optional market feeds | Curated rates/CPI context where integrated; otherwise qualify estimates | No pretending live CBN quotes without a feed |
| `investment_advisor` | Products, allocation, NGX/global | Holdings, goals, risk | Portfolio APIs, position weights, dividend history | No personalized “buy now” without risk context |
| `opportunity_scout` | Grants, programs, side income | Profile, goals, scout corpus | Scout jobs / curated listings | No unverified “too good to be true” offers |
| `tax_advisor` | PAYE, VAT, FIRS framing | Income signals, expense categories | Rule-based estimates + clear assumptions | Not a substitute for a licensed tax adviser for complex filings |
| `behavioral_coach` | Habits, impulses, discipline | Spending patterns, goals | Trends from transactions + heuristics | No clinical mental-health claims |
| `debt_manager` | APR, payoff order, refinancing | Liabilities, minimums | Weighted APR, avalanche/snowball math in code | No promising lender approvals |
| `savings_optimizer` | Emergency fund, MMF, autosave | Balances, goals, rates | Product comparison tables / live rates when wired | Rates stale-date must be stated |
| `risk_assessor` | Volatility, concentration | Portfolio positions | Exposure calculations, concentration metrics | VaR/stress language only with methodology caveats |
| `life_planner` | Horizons, retirement, milestones | Goals, income, DNA | Projection helpers with stated assumptions | Long horizons = scenario bands, not single certainties |
| `education` | Definitions, literacy | None required | Glossaries / curated explainers (optional RAG) | No fabricated regulatory citations |

## In-context learning (ICL)

- Maintain **versioned** few-shot banks per `intent_bucket` (YAML or DB), approved by product/legal — no PII.
- Refresh from production **red-team** failures (refusal quality, wrong tool choice).

## Tier-1 curated RAG (`apps.knowledge`)

- **Postgres + pgvector** table `KnowledgeChunk`, ingested from `backend/books/` via `manage.py ingest_books` and `apps/knowledge/data/books_manifest.json`.
- **Embeddings**: `mistral-embed` via `core.embeddings_factory.get_embedding_model()` — same model for ingest and query.
- Gate retrieval by **`agent_tags` overlap** with the specialist key; **`is_time_sensitive`** must stay false for the book corpus at retrieval time.
- Cite book passages when used; **never** use Tier-1 text for current rates, deadlines, or prices — those are Tier-2 or **researcher** (Tavily) with explicit attribution.

## Domain evaluation (CI / nightly)

- **Per agent**: 20–50 fixed prompts; assert expected tools or SQL patterns where possible; numeric tolerances on golden totals.
- **Coordinator**: routing JSON schema; synthesis prompt substrings (see `core/tests/test_coordinator_prompts.py`).
- **Telemetry**: `COORD_METRIC` lines for routing and completion (`agents/telemetry.py`).

## Changelog

- **2026-04-11**: Initial contracts document aligned with `AGENT_REGISTRY` in `coordinator.py`.
- **2026-04-12**: Added `researcher` + Tier-1 `apps.knowledge` RAG contracts.
