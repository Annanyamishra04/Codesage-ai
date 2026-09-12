CodeSage AI 🧠✨

An AI-powered code reviewer and plagiarism checker I built to actually understand how a full-stack, production-style app comes together — auth, a real database, AI integration, and a clean UI, all in one project.

You paste your code, pick a language, and get back a structured review: bugs, security issues, performance notes, readability feedback, and even a refactored version of your code. There's also a plagiarism/similarity checker that compares two snippets and tells you why they're similar, not just a random score.

🔗 Live demo: [add your Vercel URL here] 📦 Tech: Next.js 14 · TypeScript · Prisma · PostgreSQL · Tailwind CSS

Why I built this

I wanted a project that wasn't just a CRUD app — something that actually felt like a real product. So this has real accounts (not fake auth), a real Postgres database, per-user data isolation, and an AI layer that's swappable between providers without touching the rest of the codebase. It's also fully usable with zero API keys thanks to a mock AI provider that still gives meaningfully different results depending on what code you feed it.

What it does
🔍 Code Review
Paste code into a Monaco-powered editor (same editor VS Code uses)
Pick from JavaScript, TypeScript, Python, Java, C++, Go, SQL
Get an overall score + 4 sub-scores (security, performance, maintainability, readability)
Issues are categorized by severity (critical/high/medium/low) and tagged by source (AI vs. static analysis)
A lightweight static analysis layer catches obvious stuff instantly — hardcoded secrets, eval(), SELECT *, unscoped DELETE, leftover console.logs, etc.
Get a refactored version of your code with the fixes applied
🧬 Plagiarism / Similarity Checker
Paste two code snippets and get a real similarity score — not a random number
Compares raw tokens and an identifier-normalized version (so renaming variables doesn't fool it)
Shows exactly which lines matched and explains the score in plain English
Everything runs locally — no code is ever sent to an external plagiarism database
👤 Accounts
Sign up / log in with email + password (bcrypt-hashed, obviously)
Server-side sessions (random tokens, hashed before they touch the database)
Every review and plagiarism check is private to your account
Profile page with your stats — total reviews, average scores, recent activity
🕘 History
Every review and plagiarism check gets saved
Search, filter by language, filter by score range
Detail pages for each past check
Screenshots

(drop your own screenshots here — the review workspace, a completed review, and the plagiarism checker look great in a README)

Tech Stack
Layer	Choice
Framework	Next.js 14 (App Router) + TypeScript
Styling	Tailwind CSS
Code editor	Monaco Editor
Database	PostgreSQL (hosted on Neon)
ORM	Prisma
Validation	Zod
AI	Provider-agnostic — mock / OpenAI / Anthropic, swappable via env vars
Hosting	Vercel

No Docker, no Redis, no background workers — it runs entirely on serverless functions + a single Postgres database.

How the AI part works

The AI layer is built behind a single interface:

ts
interface AIProvider {
  reviewCode(input: { code: string; language: string }): Promise<CodeReviewResult>;
}

Swapping providers is just an env var change — AI_PROVIDER=mock | openai | anthropic. Nothing else in the app (API routes, UI, database logic) knows or cares which provider is active. The mock provider is the default, and it's not just a placeholder — it actually parses the submitted code and generates different, realistic results depending on what's really in there, so the whole app can be demoed with zero API cost.

How the similarity score works

The plagiarism checker never sends your code anywhere. It's a purely local comparison:

Strip comments/whitespace (language-aware)
Tokenize both snippets
Compare a raw token stream (catches near-identical copies) and a normalized stream where identifiers/numbers/strings are abstracted (catches renamed-variable copies)
Combine three weighted signals into a final 0–100 score, and classify it as Very Low / Low / Moderate / High / Very High

The three signals are always shown separately in the UI — the score is never a black box.

Running it locally
bash
# 1. Install dependencies
npm install

# 2. Set up your environment
cp .env.example .env
# then fill in DATABASE_URL (a free Neon Postgres project works great)

# 3. Set up the database
npx prisma migrate dev --name init

# 4. Run it
npm run dev

Visit http://localhost:3000. Leave AI_PROVIDER=mock in your .env and you don't need any API key to try the whole app.

Project structure
src/
  app/                  # pages + API routes (Next.js App Router)
  components/           # UI split by feature (review, plagiarism, history, auth)
  lib/
    ai/                 # provider interface + implementations
    auth/               # password hashing, sessions
    plagiarism/         # tokenizer + similarity engine
    static-analysis/    # rule-based checks
    validators/         # Zod schemas
prisma/
  schema.prisma         # User, Session, Review, PlagiarismCheck models
What I'd add next
Rate limiting on auth + AI endpoints
Email verification / password reset
More languages for static analysis
An AST-based (not just token-based) plagiarism mode
Author

Built by Annanya Mishra GitHub: @Annanyamishra04

If you find bugs or have ideas, feel free to open an issue — this is very much a living project.