# CodeSage AI — AI-Powered Code Reviewer & Plagiarism Checker

CodeSage AI is a full-stack developer tool that analyzes source code and produces a
structured, actionable code review: bug detection, security analysis, performance
insights, code-quality/readability feedback, a refactored version of your code, and
persistent review history — all backed by a real database and a swappable AI provider.

It also includes a **Code Plagiarism / Similarity Checker** that compares two code
snippets using local tokenization and sequence-matching (no external service, no
paid API), and a full **user account system** so every review and plagiarism check is
private to the account that created it.

Built as a portfolio-quality project demonstrating full-stack + AI engineering skills.

---

## Features

### Accounts & security
- **Email/password accounts** — sign up, log in, log out, with bcrypt password hashing (passwords are never stored or returned in plain text)
- **Server-side sessions** — random tokens stored (SHA-256 hashed) in Postgres via a `Session` model, delivered as an httpOnly, `sameSite=lax` cookie
- **Per-user data isolation** — every review and plagiarism check is owned by exactly one `User`; all list/detail/delete API routes filter by the signed-in user's ID server-side, so one account can never read or delete another account's data by guessing/changing an ID
- **Profile page** (`/profile`) — name, email, user ID, join date, review/plagiarism counts, average scores, and recent activity

### Code review
- **Split-panel review workspace** — Monaco editor on the left, structured results on the right
- **Structured AI reviews** validated with Zod (overall score, 4 sub-scores, categorized issues, strengths, refactored code, final recommendation)
- **Lightweight static analysis layer** (no external service, runs instantly) that flags things like hardcoded secrets, `eval()`/`exec()`, `console.log`/`print` leftovers, `SELECT *`, `DELETE` without `WHERE`, and more — clearly labeled separately from AI-detected issues
- **AI provider abstraction** — swap between a zero-cost mock provider, OpenAI (or any OpenAI-compatible endpoint), or Anthropic purely via environment variables; business logic never touches a concrete provider
- **Demo/mock mode** — the app is fully usable and demonstrable with zero API keys; a "Demo Mode" badge appears in the UI when active
- **Persistent, per-user review history** with search, language filter, score-range filter, and delete (with confirmation)
- **Review detail pages** at `/history/[id]` showing the complete saved review

### Plagiarism / code similarity checker
- **`/plagiarism`** — paste two snippets, pick a language, run a similarity analysis
- **Genuine lexical comparison**, not a random number: tokenization, comment/whitespace normalization, and identifier abstraction feed a weighted score (see [How the similarity score is calculated](#how-the-similarity-score-is-calculated))
- **Classification** into Very Low / Low / Moderate / High / Very High similarity (0–20 / 21–40 / 41–60 / 61–80 / 81–100), with matched line-range sections and a plain-language explanation
- **Saved history** at `/history` (Plagiarism Checks tab) and detail pages at `/history/plagiarism/[id]`

### General
- **Polished, accessible UI** — loading/empty/error states, toasts, responsive layout, dark mode
- **Clean architecture** — business logic lives in `src/lib`, not inside page components

---

## Architecture

```
Code Submission
      ↓
Zod input validation (language, size limits)
      ↓
Static analysis (regex-based, per-language rules)
      ↓
AI Provider (interface-based; mock | openai | anthropic)
      ↓
Zod validation of the AI's structured JSON response
      ↓
Merge AI issues + static-analysis issues
      ↓
Persist to PostgreSQL via Prisma
      ↓
Return full review to the client
```

The **AI provider abstraction** (`src/lib/ai/`) is the key extensibility point:

```ts
interface AIProvider {
  readonly name: string;
  reviewCode(input: { code: string; language: SupportedLanguage }): Promise<CodeReviewResult>;
}
```

`src/lib/ai/get-provider.ts` reads `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL`
from the environment and returns the matching implementation. Everywhere else in the app
depends only on the `AIProvider` interface — adding a new provider (e.g. Gemini, a local
model server) means adding one new file and one `case` in the factory, with zero changes
to API routes, the pipeline, or the UI.

### Authentication

```
Sign up / Log in
      ↓
Zod validation (email format, password length)
      ↓
bcrypt hash (sign up) / bcrypt compare (log in)
      ↓
Random 32-byte session token generated
      ↓
Only SHA-256(token) is stored in the Session table — the raw token is not
      ↓
Raw token set as an httpOnly, sameSite=lax cookie
      ↓
Every subsequent request: cookie → hash → Session lookup → User
```

There is no JWT and no separate session secret to configure — the session token
*is* the credential, and its hash in the database is the only way to validate it,
the same trust model as password hashing. `requireUser()` (API routes) and
`requireUserOrRedirect()` (Server Components/pages) are the two entry points
everything else uses; see `src/lib/auth/current-user.ts`.

### How the similarity score is calculated

The plagiarism checker (`src/lib/plagiarism/`) never sends code anywhere — it's a
pure, local, lexical comparison of the two snippets you submit:

1. **Comment/whitespace stripping** (language-aware: `//` `/* */` for C-style
   languages, `#` for Python, `--` `/* */` for SQL) so formatting and comment
   changes alone don't affect the score.
2. **Tokenization** into identifiers, keywords, numbers, strings, and operators,
   with each token's original line number preserved.
3. **Two token streams** are compared:
   - the **raw** stream (catches near-identical copies / formatting-only changes)
   - an **identifier-normalized** stream, where non-keyword identifiers become
     `ID`, numbers become `NUM`, and strings become `STR` (catches copies where
     variables/functions were renamed)
4. **Three signals**, each 0–100%, combined into the final score:
   - `rawTokenSimilarity` (30% weight) — Jaccard similarity of 5-token shingles on the raw stream
   - `normalizedTokenSimilarity` (35% weight) — the same Jaccard measure on the normalized stream
   - `matchedCoverage` (35% weight) — the share of tokens covered by long, contiguous, non-overlapping matched runs found via a greedy shingle-matching pass (a simplified take on the technique behind MOSS-style detectors)
5. The final 0–100 score maps to a classification (same thresholds everywhere in the app): **0–20 Very Low**, **21–40 Low**, **41–60 Moderate**, **61–80 High**, **81–100 Very High**.

This is documented so the score is never a black box — the UI shows the three
signals separately, not just the final number.

**Limitations (stated plainly, not overclaimed):**
- It compares **only the two snippets you provide**. It does **not** search the
  internet, GitHub, Stack Overflow, or any external corpus — there is no
  "internet-wide plagiarism detection" here.
- It's a lexical/token-level comparison, not a full AST/semantic diff — two
  algorithmically identical solutions written in very different styles may
  score lower than a human reviewer would expect, and it can be evaded by
  substantial restructuring.
- Comment stripping is regex/state-machine based per language, not a real
  parser, so unusual syntax (e.g. nested template literals with embedded code)
  may not be handled perfectly.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui-style components + Lucide icons |
| Code editor | Monaco Editor |
| Database | PostgreSQL (Neon-compatible) |
| ORM | Prisma |
| Validation | Zod |
| AI | Provider-agnostic (mock / OpenAI / Anthropic) |
| Deployment | Vercel + Neon (free tier compatible) |

No Docker, no Redis, no background workers — everything runs on Vercel's serverless
functions and a single Postgres database.

---

## Project Structure

```
src/
  app/
    page.tsx                        # Landing page
    login/page.tsx                  # Log in
    signup/page.tsx                 # Sign up
    profile/page.tsx                # Account profile + stats + recent activity
    review/page.tsx                 # Code review workspace (auth required)
    plagiarism/page.tsx             # Plagiarism checker workspace (auth required)
    history/page.tsx                # Review + plagiarism history (tabs)
    history/[id]/page.tsx           # Review detail page
    history/plagiarism/[id]/page.tsx# Plagiarism check detail page
    api/
      auth/register|login|logout|me # Account/session endpoints
      reviews/route.ts              # POST (create) / GET (list) — auth required
      reviews/[id]/route.ts         # GET (detail) / DELETE — ownership enforced
      plagiarism/check/route.ts     # POST — run analysis without saving
      plagiarism/route.ts           # POST (save) / GET (list) — auth required
      plagiarism/[id]/route.ts      # GET (detail) / DELETE — ownership enforced
      config/route.ts               # Exposes demoMode flag only
  components/
    ui/                       # Design-system primitives (button, card, dialog, ...)
    auth/                     # Auth context, login/signup forms
    review/                   # Editor panel, results panel, issue cards, diff viewer
    plagiarism/               # Comparison editors, result panel, similarity ring
    history/                  # List item cards, delete dialogs, tab views
    layout/                   # Navbar, theme provider
  lib/
    ai/                       # Provider interface, prompt, factory, implementations
    auth/                     # Password hashing, session tokens, current-user helpers
    plagiarism/               # Tokenizer + weighted similarity engine
    static-analysis/          # Rule-based static checks per language
    validators/               # Zod schemas (requests + AI response shape + auth)
    review-pipeline.ts        # Orchestrates the full review flow
    prisma.ts                 # Prisma client singleton
    env.ts                    # Server-side env var validation/fallbacks
    api-error.ts              # Standardized error codes/responses
    api-client.ts             # Typed fetch helpers used by the UI
    examples.ts               # "Load example" snippets per language
  types/
    review.ts                 # Shared review types
    plagiarism.ts              # Shared plagiarism-checker types
    user.ts                    # Public-safe user type
prisma/
  schema.prisma               # User, Session, Review, PlagiarismCheck models
```

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

At minimum, set `DATABASE_URL` (see [Database setup](#database-setup-neon) below).
Leave `AI_PROVIDER=mock` to run with zero AI cost — see [Mock mode](#mock-demo-mode).

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

This creates the `User`, `Session`, `Review`, and `PlagiarismCheck` tables.

### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Database Setup (Neon)

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Copy the **direct/unpooled** connection string (same host without `-pooler`) into `DATABASE_URL_UNPOOLED`. Prisma Migrate uses this for schema changes; the app uses the pooled URL at runtime.
4. Run `npx prisma migrate dev --name init` locally once to create the `Review` table, or `npx prisma migrate deploy` in CI/production.

Any standard PostgreSQL database works too — Neon is simply free-tier friendly.

---

## AI Provider Configuration

Set these in `.env` (or your hosting provider's environment variables):

```env
AI_PROVIDER=mock        # mock | openai | anthropic
AI_API_KEY=             # required for openai/anthropic
AI_MODEL=gpt-4o-mini    # provider-specific model name
# AI_BASE_URL=          # optional, openai-compatible endpoints only
```

### Mock / Demo Mode

When `AI_PROVIDER=mock` (or unset), CodeSage AI uses a built-in mock provider
(`src/lib/ai/providers/mock-provider.ts`) that generates realistic,
schema-valid review results with no external calls and no cost — and no user
code is ever executed. This lets the entire app, including persistence and
history, be demoed and developed without an API key. The UI displays a "Demo
Mode" notice whenever this provider is active.

Unlike a purely random placeholder, the mock provider actually inspects the
submitted code:

- **Content-aware issues** — findings depend on what's really in the
  snippet (e.g. `eval()`/`exec()`, bare `except:`, unscoped `DELETE`/`UPDATE`,
  `SELECT *`, leftover `console.log`, deep nesting, magic numbers), so
  different submissions produce genuinely different reviews.
- **Consistent scores** — the four sub-scores and overall score are computed
  from the severity of the issues actually found, not an unrelated random
  number.
- **Real refactoring, not a copy-paste** — `refactoredCode` applies small,
  safe, deterministic transforms (stripping debug logging, `var` → `let`,
  obvious identifier renames, formatting cleanup) and explicitly flags things
  it does *not* pretend to fix (e.g. `eval()`, unscoped SQL writes) with an
  inline comment rather than silently rewriting them.
- **Clearly distinguishable from static analysis** — every mock-provider
  issue is tagged `source: "ai"`, exactly like a real AI provider's output,
  so it's never confused with the separate `source: "static_analysis"`
  findings described above.

### OpenAI (and OpenAI-compatible endpoints)

```env
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

Set `AI_BASE_URL` to point at any OpenAI-compatible chat completions endpoint
(OpenRouter, Groq, Together AI, a self-hosted server) without code changes.

### Anthropic

```env
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-6
```

All AI calls happen server-side only (inside API routes / the pipeline) — the API key
is never sent to the browser.

---

## GitHub Repository Link

The landing page footer includes a "View source" link. Its target is read from
`NEXT_PUBLIC_GITHUB_URL` at build time rather than being hardcoded, so forks
and private deployments never point at an unrelated repository:

```env
NEXT_PUBLIC_GITHUB_URL=https://github.com/your-org/codesage-ai
```

This is a `NEXT_PUBLIC_` variable, so it is intentionally exposed to the
browser — never put anything sensitive in it. If it's left unset, the link is
disabled (greyed out, non-navigable) instead of falling back to a generic
`github.com` URL.

---

## Environment Variable Validation

Server-side environment handling (`src/lib/env.ts`, `src/lib/prisma.ts`,
`src/lib/ai/get-provider.ts`) follows these rules:

- **Never crash at import time.** Pages and routes that don't touch the
  database or the AI provider (e.g. the landing page) always render, even
  with an incomplete `.env`.
- **`DATABASE_URL`** is checked lazily, the first time it's actually needed.
  If missing, a clear one-time warning is logged server-side (copy
  `.env.example` to `.env` and set a Postgres connection string), and any
  request that touches the database fails with a safe, generic
  `DATABASE_ERROR` — never a raw driver/connection-string error.
- **`DATABASE_URL_UNPOOLED`** is used by Prisma Migrate / `directUrl` for
  schema changes and deployments; the pooled `DATABASE_URL` is used by the
  app at runtime.
- **`AI_PROVIDER`** must be one of `mock | openai | openai-compatible | anthropic`.
  An unrecognized value logs a clear warning and falls back to `mock` rather
  than crashing.
- **`AI_API_KEY`** is required only for providers that need it (`openai`,
  `openai-compatible`, `anthropic`); `mock` needs no key at all. Selecting a
  real provider without a key fails fast with an `AI_CONFIG_MISSING` error
  that names exactly what's missing.
- **`AI_MODEL`** falls back to a sensible per-provider default
  (`gpt-4o-mini` for OpenAI, `claude-sonnet-4-6` for Anthropic) when unset.
- **Secrets never reach the browser.** `AI_API_KEY`, `DATABASE_URL`, and
  `DATABASE_URL_UNPOOLED` are read only in server-side code (API routes,
  `src/lib`); `/api/config` exposes only a derived `demoMode` boolean.

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repo into [Vercel](https://vercel.com/new).
3. Add environment variables in the Vercel project settings: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` (and `AI_BASE_URL` / `NEXT_PUBLIC_GITHUB_URL` if used).
4. Vercel runs `npm install` (which triggers `prisma generate` via `postinstall`) and `npm run build` automatically.
5. Before the first deploy (or after schema changes), run the migration against your production database:

   ```bash
   npx prisma migrate deploy
   ```

   You can run this from your local machine (pointed at the production `DATABASE_URL_UNPOOLED`) or wire it into a CI step.

No Docker, no Redis, no background workers required — the app runs entirely on Vercel's
serverless functions and Neon's free Postgres tier.

---

## Security Notes

**Authentication & sessions**
- Passwords are hashed with bcrypt (cost factor 12) via `bcryptjs`; plain-text passwords are never stored, logged, or returned in any API response (`select` clauses explicitly omit `passwordHash` everywhere).
- Sessions are random 32-byte tokens; only a SHA-256 hash of the token is persisted in the `Session` table, so a database read alone cannot be used to forge a session, mirroring the password-hashing trust model.
- The session cookie is `httpOnly` (inaccessible to JavaScript, mitigating XSS-based token theft), `sameSite=lax` (mitigates CSRF on state-changing cross-site requests), and `secure` in production.
- Login and registration return the identical error for "no such account" and "wrong password" so a login form can't be used to enumerate which emails have accounts.

**Authorization / IDOR prevention**
- Every review and plagiarism-check list/detail/delete API route calls `requireUser()` first, then scopes the Prisma query to `userId: user.id` — the user ID always comes from the verified session, never from a client-supplied parameter.
- Detail/delete routes fetch the record, compare `record.userId !== user.id`, and return a generic `NOT_FOUND` (not `FORBIDDEN`) either way — this is deliberate: it never confirms that a given ID belongs to *someone else*, only that it isn't accessible to *you*.
- Protected pages (`/review`, `/plagiarism`, `/history`, `/profile`) check the session **server-side** (`requireUserOrRedirect`, in the Server Component itself) before rendering — there is no "hide the button, still call the API" pattern; the API layer enforces the same check independently, so it's safe even if a page-level check were ever bypassed.

**General**
- All inputs are validated server-side with Zod (language allow-list, code length limit, email format, password length).
- AI API keys are read from environment variables and used only in server-side code (API routes / `src/lib`); they are never exposed to the client.
- The `/api/config` endpoint exposes only a derived `demoMode` boolean — never keys, provider names, or connection strings.
- No user-submitted code is ever executed (`eval` is never used on submitted code, in either the review pipeline or the plagiarism checker).
- Errors are returned in a consistent `{ error: { code, message } }` shape without leaking internal details (stack traces, DB errors) to the client.
- **Not implemented / known limitations**: there is no rate limiting on login/registration or on the AI/plagiarism endpoints (see [Production Considerations](#production-considerations)), no email verification, and no password-reset flow — all reasonable additions for a production deployment beyond this project's scope.

---

## Production Considerations

- **Database connection limits**: use the pooled Neon connection string for
  `DATABASE_URL` in serverless environments (many short-lived Vercel function
  invocations otherwise exhaust direct Postgres connections). `DATABASE_URL_UNPOOLED`
  is only for Prisma Migrate / CI, not for the running app.
- **Cold starts**: the Prisma client is cached on `globalThis` in development
  to survive hot reloads; in each fresh serverless invocation a new client is
  created as expected — this is normal and does not require extra configuration.
- **Rate limiting / abuse protection**: this project does not implement
  request rate limiting. If exposing a public deployment with a real AI
  provider configured, consider adding rate limiting (e.g. at the edge/proxy
  layer) to avoid unexpected AI API costs.
- **Code length limits**: `MAX_CODE_LENGTH` (`src/lib/validators/schemas.ts`)
  caps submissions at 20,000 characters; adjust based on your AI provider's
  context window and cost tolerance.
- **Observability**: server-side errors are logged via `console.error` with
  full detail; only sanitized `{ code, message }` pairs are ever returned to
  the client. Wire these logs into your platform's logging/monitoring (e.g.
  Vercel's log drains) for production visibility.

---

## Quality Notes

- Business logic is isolated in `src/lib`; page/API route files stay thin.
- Every issue in a review response is tagged `source: "ai" | "static_analysis"` so the UI (and any consumer of the API) can distinguish them.
- AI and static-analysis findings are de-duplicated (`dedupeIssues` in `src/lib/review-pipeline.ts`) when they flag the same category on the same or overlapping lines with a near-identical title, so the same problem is never shown twice.
- The Zod schema for AI responses is intentionally strict; a response that fails validation results in a clean `AI_RESPONSE_INVALID` error rather than corrupt data reaching the database.
