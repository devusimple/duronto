import { Link } from 'waku';

const codeSchema = `import { table, id, text, int, timestamp, ref, enumType } from "duronto";

export const user = table("user", {
  id: id(),
  email: text().unique().notNull(),
  name: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const post = table("post", {
  id: id(),
  title: text().notNull(),
  status: enumType(["draft", "published"] as const).notNull(),
  authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(),
});`;

const codeSql = `CREATE TABLE "user" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "post" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "author_id" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX "post_author_id_idx" ON "post"("author_id");`;

const codeTypes = `import type { InferSelect, InferInsert } from "duronto";
import { post } from "./db/schema";

type Post = InferSelect<typeof post>;
type NewPost = InferInsert<typeof post>;
// status: "draft" | "published"
// authorId resolves to the referenced column type`;

const features = [
  {
    title: 'Typed schema API',
    body: 'Define tables, columns, modifiers, foreign keys, junction tables, and table constraints in TypeScript with inferred types.',
  },
  {
    title: 'SQL generation',
    body: 'Compile the schema to dialect-aware DDL for supported targets (SQLite and PostgreSQL).',
  },
  {
    title: 'Migrations from snapshots',
    body: 'Generate migration SQL by diffing the current schema against a stored snapshot, with rename hints and destructive-change guards.',
  },
  {
    title: 'Type outputs for app code',
    body: 'Use `InferSelect` / `InferInsert` / `InferUpdate`, generated aliases, or a dependency-free SDK (`duronto sdk`).',
  },
  {
    title: 'Development-time only',
    body: 'duronto runs in the CLI/codegen workflow. Install it as a dev dependency and keep runtime bundles free of schema tooling.',
  },
  {
    title: 'Deterministic IR',
    body: 'Schemas compile to a dialect-neutral, versioned intermediate representation with stable ordering for clean diffs.',
  },
];

const workflow = [
  { step: '01', title: 'Define', body: 'Author tables in TypeScript with builders such as `id`, `text`, `timestamp`, `ref`, and `enumType`.' },
  { step: '02', title: 'Compile', body: 'duronto loads exported schema objects and produces SQL, IR snapshots, diffs, or type artifacts.' },
  { step: '03', title: 'Review', body: 'Inspect generated SQL, preview pending operations with `diff`, and gate destructive changes explicitly.' },
  { step: '04', title: 'Apply', body: 'Run generated migration SQL with your database/migration tooling and consume generated types in application code.' },
];

const commands = [
  ['duronto init', 'Create config and migration scaffolding.'],
  ['duronto sql', 'Print full CREATE SQL for the schema.'],
  ['duronto generate --name add_posts', 'Write migration SQL and update the snapshot.'],
  ['duronto diff', 'Show pending schema operations without writing.'],
  ['duronto check', 'Fail when schema and snapshot diverge (CI).'],
  ['duronto types', 'Generate schema-derived type aliases.'],
  ['duronto sdk --out ./db/sdk.gen.ts', 'Generate standalone types with no duronto import.'],
];

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-xl border border-fd-border bg-fd-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-fd-border px-4 py-2.5">
        <span className="text-xs font-medium text-fd-muted-foreground">{title}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-fd-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-fd-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_oklab,var(--color-fd-primary)_18%,transparent),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center rounded-full border border-fd-border bg-fd-background/80 px-3 py-1 text-xs font-medium text-fd-muted-foreground">
              TypeScript schema definition · SQLite / PostgreSQL · dev dependency
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              Define relational schemas in TypeScript. Generate SQL you can review.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-fd-muted-foreground md:text-lg">
              duronto is a development-time tool for authoring database schemas with a typed
              API, compiling them to dialect-aware SQL, and producing type definitions for
              application code. It does not ship a runtime ORM, driver, or query engine.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/docs/getting-started"
                className="inline-flex items-center rounded-lg bg-fd-primary px-4 py-2.5 text-sm font-medium text-fd-primary-foreground"
              >
                Get started
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center rounded-lg border border-fd-border bg-fd-background px-4 py-2.5 text-sm font-medium text-fd-foreground"
              >
                Read documentation
              </Link>
              <div className="rounded-lg border border-fd-border bg-fd-muted/40 px-3 py-2 font-mono text-xs text-fd-muted-foreground">
                npm i -D duronto
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Schema first, artifacts second</h2>
            <p className="mt-3 text-sm leading-7 text-fd-muted-foreground">
              Write the schema once in TypeScript. duronto compiles exported tables to a
              dialect-neutral IR, then renders SQL or diffs for the configured dialect.
              Foreign keys use thunks for declaration order, enum values stay typed, and
              modifiers such as <code className="rounded bg-fd-muted px-1 py-0.5 text-[0.9em]">.notNull()</code> and{' '}
              <code className="rounded bg-fd-muted px-1 py-0.5 text-[0.9em]">.defaultNow()</code> affect inferred types.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { k: 'Input', v: 'TypeScript schema module' },
              { k: 'Core', v: 'Deterministic, versioned IR' },
              { k: 'Output', v: 'SQL, migrations, type artifacts' },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-fd-border bg-fd-card p-4">
                <div className="text-xs font-medium text-fd-muted-foreground">{x.k}</div>
                <div className="mt-1 text-sm font-medium">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-fd-border bg-fd-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">From definition to deployable SQL</h2>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              The same schema drives DDL generation, snapshot diffs, and type inference.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <CodeBlock title="schema.ts" code={codeSchema} />
            <CodeBlock title="duronto sql (SQLite)" code={codeSql} />
            <CodeBlock title="application types" code={codeTypes} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight">What duronto covers</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-fd-border bg-fd-card p-5">
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-fd-border bg-fd-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Migration workflow</h2>
              <p className="mt-3 text-sm leading-7 text-fd-muted-foreground">
                duronto compares compiled schemas using snapshots rather than connecting to a
                live database. You review and apply the generated SQL with your own migration
                process.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {workflow.map((w) => (
                <div key={w.step} className="rounded-xl border border-fd-border bg-fd-card p-4">
                  <div className="font-mono text-xs text-fd-primary">{w.step}</div>
                  <div className="mt-1 font-medium">{w.title}</div>
                  <p className="mt-1.5 text-sm leading-6 text-fd-muted-foreground">{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight">CLI at a glance</h2>
        <div className="mt-8 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
          {commands.map(([cmd, desc], i) => (
            <div
              key={cmd}
              className={`grid gap-2 px-4 py-3.5 md:grid-cols-[minmax(0,420px)_1fr] md:items-center ${i ? 'border-t border-fd-border' : ''}`}
            >
              <code className="text-[13px] text-fd-foreground">{cmd}</code>
              <span className="text-sm text-fd-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-fd-muted-foreground">
          Destructive operations (drops, narrowing changes) require <code className="rounded bg-fd-muted px-1 py-0.5">--allow-destructive</code> during generation.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-fd-border bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-fd-primary)_10%,var(--color-fd-card)),var(--color-fd-card))] p-8 md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Start with the schema, keep runtime clean</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-fd-muted-foreground">
            Install duronto in development, define your tables, generate SQL and types, and
            integrate the outputs with the database stack you already use.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/docs/getting-started"
              className="inline-flex items-center rounded-lg bg-fd-primary px-4 py-2.5 text-sm font-medium text-fd-primary-foreground"
            >
              Getting started
            </Link>
            <Link
              to="/docs/schema"
              className="inline-flex items-center rounded-lg border border-fd-border bg-fd-background/70 px-4 py-2.5 text-sm font-medium"
            >
              Schema reference
            </Link>
            <Link
              to="/docs/cli"
              className="inline-flex items-center rounded-lg border border-fd-border bg-fd-background/70 px-4 py-2.5 text-sm font-medium"
            >
              CLI reference
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export async function getConfig() {
  return {
    render: 'static',
  };
}