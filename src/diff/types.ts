import type { IR, IRColumn, IRTable, IRIndex, IRForeignKey } from "../core/ir.js";

export type DiffOp =
  | { kind: "createTable"; table: string }
  | { kind: "dropTable"; table: string; destructive: true }
  | { kind: "addColumn"; table: string; column: string; col: IRColumn }
  | { kind: "dropColumn"; table: string; column: string; destructive: true }
  | { kind: "alterColumn"; table: string; column: string; oldCol: IRColumn; newCol: IRColumn; destructive?: boolean; tableIR: IRTable; oldTableIR: IRTable }
  | { kind: "renameColumn"; table: string; from: string; to: string }
  | { kind: "renameTable"; from: string; to: string }
  | { kind: "addIndex"; table: string; index: string; idx: IRIndex }
  | { kind: "dropIndex"; table: string; index: string; idx: IRIndex }
  | { kind: "addForeignKey"; table: string; fk?: IRForeignKey }
  | { kind: "dropForeignKey"; table: string; fk?: IRForeignKey };

export interface DiffResult {
  ops: DiffOp[];
  destructive: boolean;
}