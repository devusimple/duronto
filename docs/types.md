# Type inference

Each column carries three phantom type parameters: `TData`, `TNotNull`, `THasDefault`.

Public helpers:

```ts
type User    = InferSelect<typeof user>;  // what you read
type NewUser = InferInsert<typeof user>;  // what you pass to INSERT
type Patch   = InferUpdate<typeof user>;  // all fields optional
```

Example for the `user` table:

```ts
type User = {
  id: number;
  email: string;
  name: string;
  age: number | null;
  active: boolean | null;
  createdAt: Date | null;
};

type NewUser = {
  id?: number;
  email: string;
  name: string;
  age?: number | null;
  active?: boolean | null;
  createdAt?: Date | null;
};
```

Rules:
- Builders are immutable; each modifier returns a new column with updated type params.
- Use `import type` so the package is erased at build time.
- Add type tests for any new column type or modifier.