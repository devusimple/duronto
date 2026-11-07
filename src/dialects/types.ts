import type { IRColumn, IRTable } from "../core/ir.js";

// DiffOp placeholder for v0.1
export type DiffOp = unknown;

export interface Dialect {
  name: string;
  quote(identifier: string): string;
  columnType(col: IRColumn): string;
  createTable(table: IRTable): string[];
  alterOps(ops: DiffOp[]): string[];
}