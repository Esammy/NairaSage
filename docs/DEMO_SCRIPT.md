# Demo Video Script (< 3 minutes)

Target: 2:50. Record at 1080p. Have a logged-in account with some data already
seeded, one saved deal, and 2–3 clear phone photos of bank statements ready.
Pre-warm the app (first Qwen call can be slow) before hitting record.

> Tip: the single most important shot for the **Agent Society** track is the
> orchestration panel showing specialists running **in parallel**. Don't rush it.

---

### 0:00–0:25 — Problem (talking head or slide over screen)

> "This is NairaSage — an AI financial co-pilot built for Nigeria, where
> inflation runs over 20%, the Naira swings, and generic finance apps just
> don't fit. Under the hood it's not one chatbot — it's a society of 13
> specialist agents, all running on Qwen models on Qwen Cloud."

### 0:25–1:05 — Agent Society in action (THE money shot)

- Open the coach chat. Type: *"I earn 450k a month, spend most of it, and want
  to start investing — what should I do?"*
- As it answers, **point at the orchestration panel**: routing decision → the
  accountant, economist, and investment-advisor chips flip to *running* at the
  same time → each shows its latency as it finishes → "synthesizing one answer."

> "Watch the team: the coordinator decomposed my question, ran three specialists
> in parallel — accountant, economist, investment advisor — then synthesized one
> grounded answer. That's qwen-flash for routing and the specialists,
> qwen3-max for the synthesis."

### 1:05–1:45 — Multimodal: scan a real bank statement (qwen3-vl)

- Click the paperclip, upload a phone photo of a Nigerian bank statement.
- The summary appears; confirm-cards show extracted assets/expenses.
- Tap **Confirm** on one card; show the statement value update.

> "Most Nigerian bank data lives in PDFs and screenshots, not open-banking
> feeds. qwen3-vl reads the statement and proposes changes — but nothing is
> written until I confirm. Same safety model, now multimodal."

### 1:45–2:20 — Visible reasoning: deal deep-analysis (qwen3-max-thinking)

- Open a saved deal → click **Analyze**.
- Let the amber "Sage is thinking…" panel stream a few lines of real reasoning,
  then the verdict and the 10-control scores. Click **Apply AI scores**.

> "For a deal, Qwen's 235B thinking model reasons through all 10 of Kiyosaki's Investor
> Controls — and you watch it think, live — then scores the deal and I can apply
> those scores in one tap."

### 2:20–2:40 — Voice + memory (qwen3-asr)

- Tap the mic, say: *"Remind me what my freedom ratio is."* Tap mic again.
- The transcript appears and the coach answers, referencing earlier context.

> "Voice is Qwen ASR, and the coach remembers my Financial DNA across the
> conversation."

### 2:40–2:50 — Close (architecture slide)

- Show the architecture diagram (README / `docs/HACKATHON.md`).

> "Everything runs on Qwen Cloud and deploys on Alibaba Cloud — ECS, OSS, and
> six Qwen models working together. NairaSage. Thank you."

---

## Shot checklist (so nothing is missed)
- [ ] Orchestration panel clearly shows ≥3 agents running in parallel
- [ ] A confirm-before-write card is tapped on screen
- [ ] Thinking model's reasoning is visibly streaming (not just the final answer)
- [ ] Voice transcript appears from speech
- [ ] Architecture diagram on screen at the end
- [ ] Total runtime under 3:00 (hard rule)
- [ ] Uploaded to YouTube/Vimeo/Youku as **public** (or unlisted with link)
