import { describe, it, expectTypeOf } from "vitest";
import { table, id, text, int, bool, timestamp } from "../../src/index.js";
import type { InferSelect, InferInsert, InferUpdate } from "../../src/index.js";

describe("type inference", () => {
  const user = table("user", {
    id: id(),
    email: text().unique().notNull(),
    name: text().notNull(),
    age: int(),
    active: bool().default(true),
    createdAt: timestamp().defaultNow(),
  });

  it("InferSelect", () => {
    type U = InferSelect<typeof user>;
    expectTypeOf<U>().toEqualTypeOf<{
      id: number;
      email: string;
      name: string;
      age: number | null;
      active: boolean | null;
      createdAt: Date | null;
    }>();
  });

  it("InferInsert", () => {
    type N = InferInsert<typeof user>;
    expectTypeOf<N>().toMatchTypeOf<{
      email: string;
      name: string;
    }>();
  });

  it("InferUpdate", () => {
    type P = InferUpdate<typeof user>;
    expectTypeOf<P>().toMatchTypeOf<{ name?: string | null }>();
  });
});