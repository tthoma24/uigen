# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # First-time setup: install deps, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack
npm run build          # Build for production
npm run lint           # Run ESLint
npm run test           # Run Vitest tests
npm run db:reset       # Reset SQLite database to initial state
```

To run a single test file: `npx vitest run src/lib/__tests__/<file>`

## Environment

Requires a `.env` file with:
- `ANTHROPIC_API_KEY` — optional; a mock language model is used when absent
- `JWT_SECRET` — required for authentication

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in chat; Claude generates code using tool calls; the result is transformed and rendered in an iframe.

### Key data flows

1. **Chat → AI**: `POST /api/chat` streams responses from Claude via Vercel AI SDK. Claude has two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete).
2. **Virtual File System (VFS)**: All generated files live in-memory only — no disk writes. The VFS is managed in `FileSystemContext` and serialized as JSON into the database `Project.data` field on save.
3. **Preview**: `PreviewFrame` grabs the active file from VFS, strips CSS imports, transforms JSX via `@babel/standalone`, and executes it in an iframe.
4. **Persistence**: Authenticated users can save projects (VFS state + chat messages) to SQLite via Prisma. Anonymous users get a temporary in-memory session tracked by `anon-work-tracker`.

### Source layout

```
src/
├── app/
│   ├── [projectId]/        # Dynamic route for saved projects
│   ├── api/chat/route.ts   # AI streaming endpoint (core AI logic lives here)
│   ├── main-content.tsx    # Root UI: resizable chat / editor / preview panels
│   └── page.tsx            # Home: redirect or new project
├── actions/                # Next.js server actions (auth, project CRUD)
├── components/
│   ├── chat/               # Chat UI components
│   ├── editor/             # Monaco code editor + file tree
│   ├── preview/            # PreviewFrame (iframe renderer)
│   ├── auth/               # Sign-in / sign-up dialogs
│   └── ui/                 # Radix UI primitives
├── lib/
│   ├── contexts/           # FileSystemContext, ChatContext
│   ├── tools/              # str-replace.ts, file-manager.ts (AI tool implementations)
│   ├── prompts/            # System prompt for Claude
│   ├── transform/          # jsx-transformer.ts (Babel JSX transform for preview)
│   ├── auth.ts             # JWT session management (httpOnly cookies, 7-day expiry)
│   ├── file-system.ts      # In-memory VFS implementation
│   └── provider.ts         # Selects real vs. mock language model
└── middleware.ts            # Protects API routes (auth check)
```

### Authentication

JWT sessions stored in httpOnly cookies. Passwords hashed with bcrypt. Anonymous access is allowed — projects are only persisted when a user is authenticated and explicitly saves.

### Tech stack

Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS v4 · Radix UI · Prisma + SQLite · Vercel AI SDK · `@babel/standalone` · Monaco Editor · Vitest
