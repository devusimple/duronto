import { describe, it, expect } from "vitest";
import { table } from "../../src/core/table.js";
import { id, text, ref } from "../../src/core/column.js";
import { compileSchema } from "../../src/compiler/compile.js";
import { durontoError } from "../../src/core/errors.js";

describe("validation", () => {
  it("throws when ref target is not unique", () => {
    const user = table("user", { id: id(), name: text().notNull() });
    const post = table("post", { id: id(), userId: ref(() => user.name).notNull() });
    let err: any;
    try { compileSchema({ user, post }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(durontoError);
    expect(err.code).toBe("REF_TARGET_NOT_UNIQUE");
  });

  it("throws set null on notNull", () => {
    const user = table("user", { id: id() });
    const post = table("post", { id: id(), userId: ref(() => user.id, { onDelete: "set null" }).notNull() });
    let err: any;
    try { compileSchema({ user, post }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(durontoError);
    expect(err.code).toBe("REF_SET_NULL_NOT_NULL");
  });
});