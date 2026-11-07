export const IR_VERSION = 1 as const;

export type LogicalType =
  | "id"
  | "uuid"
  | "text"
  | "varchar"
  | "int"
  | "bigint"
  | "real"
  | "bool"
  | "timestamp"
  | "json"
  | "enum";

export type ReferentialAction = "cascade" | "set null" | "restrict" | "no action";

export type IRDefault =
  | { kind: "value"; value: unknown }
  | { kind: "now" }
  | { kind: "auto" };

export interface IRReference {
  table: string;
  column: string;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
}

export interface IRColumn {
  type: LogicalType;
  length?: number;
  enumValues?: string[];
  notNull: boolean;
  primaryKey: boolean;
  unique: boolean;
  default?: IRDefault;
  check?: string;
  references?: IRReference;
  renamedFrom?: string;
}

export interface IRIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface IRForeignKey {
  columns: string[];
  references: { table: string; columns: string[] };
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
}

export interface IRTable {
  name: string;
  columns: Record<string, IRColumn>;
  primaryKey: string[];
  uniques: string[][];
  indexes: IRIndex[];
  checks: string[];
  foreignKeys: IRForeignKey[];
}

export interface IR {
  version: typeof IR_VERSION;
  tables: Record<string, IRTable>;
}