import type { IR } from "../core/ir.js";
import type { DiffOp, DiffResult } from "./types.js";

function colEqual(a: IR["tables"][string]["columns"][string], b: typeof a): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diff(oldIR: IR | null, newIR: IR): DiffResult {
  const ops: DiffOp[] = [];
  let destructive = false;
  const oldTables = oldIR?.tables ?? {};
  const newTables = newIR.tables;

  // dropped tables
  for (const name of Object.keys(oldTables)) {
    if (!(name in newTables)) {
      ops.push({ kind: "dropTable", table: name, destructive: true });
      destructive = true;
    }
  }
  // created tables
  for (const name of Object.keys(newTables)) {
    if (!(name in oldTables)) {
      ops.push({ kind: "createTable", table: name });
    }
  }

  // modified tables
  for (const name of Object.keys(newTables)) {
    if (!(name in oldTables)) continue;
    const oldT = oldTables[name]!;
    const newT = newTables[name]!;

    // renamed columns detection
    const renamedOld = new Set<string>();
    const renamedNew = new Set<string>();

    // columns added
    for (const [newCol, newColDef] of Object.entries(newT.columns)) {
      if (newCol in oldT.columns) continue;
      const hint = newColDef.renamedFrom;
      if (hint && hint in oldT.columns) {
        ops.push({ kind: "renameColumn", table: name, from: hint, to: newCol });
        renamedOld.add(hint);
        renamedNew.add(newCol);
      } else {
        ops.push({ kind: "addColumn", table: name, column: newCol, col: newColDef });
      }
    }
    // columns dropped
    for (const oldCol of Object.keys(oldT.columns)) {
      if (oldCol in newT.columns) continue;
      if (renamedOld.has(oldCol)) continue;
      ops.push({ kind: "dropColumn", table: name, column: oldCol, destructive: true });
      destructive = true;
    }
    // columns altered
    for (const col of Object.keys(newT.columns)) {
      if (!(col in oldT.columns)) continue;
      if (renamedNew.has(col)) continue;
      const oldCol = oldT.columns[col]!;
      const newCol = newT.columns[col]!;
      if (!colEqual(oldCol, newCol)) {
        const isDestructive =
          oldCol.type !== newCol.type ||
          (!oldCol.notNull && newCol.notNull) ||
          (oldCol.unique && !newCol.unique);
        ops.push({ kind: "alterColumn", table: name, column: col, oldCol: oldCol, newCol: newCol, destructive: isDestructive, tableIR: newT, oldTableIR: oldT });
        if (isDestructive) destructive = true;
      }
    }

    // indexes
    const oldIdx = new Map(oldT.indexes.map((i) => [i.name, i]));
    const newIdx = new Map(newT.indexes.map((i) => [i.name, i]));
    for (const idxName of newIdx.keys()) {
      if (!oldIdx.has(idxName)) ops.push({ kind: "addIndex", table: name, index: idxName, idx: newIdx.get(idxName)! });
    }
    for (const idxName of oldIdx.keys()) {
      if (!newIdx.has(idxName)) ops.push({ kind: "dropIndex", table: name, index: idxName, idx: oldIdx.get(idxName)! });
    }

    // foreign keys (count-based)
    if (newT.foreignKeys.length > oldT.foreignKeys.length) {
      const fk = newT.foreignKeys[newT.foreignKeys.length - 1];
      ops.push(fk ? { kind: "addForeignKey", table: name, fk } : { kind: "addForeignKey", table: name });
    } else if (newT.foreignKeys.length < oldT.foreignKeys.length) {
      const fk = oldT.foreignKeys[oldT.foreignKeys.length - 1];
      ops.push(fk ? { kind: "dropForeignKey", table: name, fk } : { kind: "dropForeignKey", table: name });
    }
  }

  // sort for determinism
  ops.sort((a, b) => {
    const ta = (a as { table?: string }).table ?? "";
    const tb = (b as { table?: string }).table ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.kind.localeCompare(b.kind);
  });

  return { ops, destructive };
}