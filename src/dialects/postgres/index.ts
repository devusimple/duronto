import type { Dialect } from "../types.js";
import type { IR, IRColumn, IRTable } from "../../core/ir.js";

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function columnType(col: IRColumn): string {
  switch (col.type) {
    case "id":
      return "SERIAL PRIMARY KEY";
    case "uuid":
      return "UUID";
    case "text":
      return "TEXT";
    case "varchar":
      return col.length ? `VARCHAR(${col.length})` : "VARCHAR";
    case "int":
      return "INTEGER";
    case "bigint":
      return "BIGINT";
    case "real":
      return "DOUBLE PRECISION";
    case "bool":
      return "BOOLEAN";
    case "timestamp":
      return "TIMESTAMPTZ";
    case "json":
      return "JSONB";
    case "enum":
      return "TEXT";
    default:
      return "TEXT";
  }
}

function literal(value: unknown): string {
  if (value === null) return "NULL";
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function columnDef(colName: string, col: IRColumn): string {
  const parts: string[] = [quote(colName), columnType(col)];
  if (col.type !== "id" && col.primaryKey) parts.push("PRIMARY KEY");
  if (col.notNull && col.type !== "id") parts.push("NOT NULL");
  if (col.unique) parts.push("UNIQUE");
  if (col.default) {
    if (col.default.kind === "now") parts.push("DEFAULT CURRENT_TIMESTAMP");
    else if (col.default.kind === "value") parts.push(`DEFAULT ${literal(col.default.value)}`);
  }
  if (col.check) parts.push(`CHECK (${col.check})`);
  if (col.references) {
    const ref = col.references;
    let clause = `REFERENCES ${quote(ref.table)}(${quote(ref.column)})`;
    if (ref.onDelete && ref.onDelete !== "no action") clause += ` ON DELETE ${ref.onDelete.toUpperCase().replace("SET NULL", "SET NULL")}`;
    if (ref.onUpdate && ref.onUpdate !== "no action") clause += ` ON UPDATE ${ref.onUpdate.toUpperCase().replace("SET NULL", "SET NULL")}`;
    parts.push(clause);
  }
  if (col.type === "enum" && col.enumValues && col.enumValues.length) {
    const allowed = col.enumValues.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
    parts.push(`CHECK (${quote(colName)} IN (${allowed}))`);
  }
  return parts.join(" ");
}

function createTable(table: IRTable): string[] {
  const out: string[] = [];
  const colDefs: string[] = [];
  for (const [colName, col] of Object.entries(table.columns)) {
    colDefs.push(columnDef(colName, col));
  }
  if (table.primaryKey.length > 0) {
    const singleId = table.primaryKey.length === 1 && table.columns[table.primaryKey[0]!]?.type === "id";
    if (!singleId) colDefs.push(`PRIMARY KEY (${table.primaryKey.map(quote).join(", ")})`);
  }
  for (const u of table.uniques) {
    colDefs.push(`UNIQUE (${u.map(quote).join(", ")})`);
  }
  for (const c of table.checks) {
    colDefs.push(`CHECK (${c})`);
  }
  for (const fk of table.foreignKeys) {
    let clause = `FOREIGN KEY (${fk.columns.map(quote).join(", ")}) REFERENCES ${quote(fk.references.table)}(${fk.references.columns.map(quote).join(", ")})`;
    if (fk.onDelete !== "no action") clause += ` ON DELETE ${fk.onDelete.toUpperCase().replace("SET NULL", "SET NULL")}`;
    if (fk.onUpdate !== "no action") clause += ` ON UPDATE ${fk.onUpdate.toUpperCase().replace("SET NULL", "SET NULL")}`;
    colDefs.push(clause);
  }
  out.push(`CREATE TABLE ${quote(table.name)} (\n  ${colDefs.join(",\n  ")}\n);`);
  for (const idx of table.indexes) {
    const unique = idx.unique ? "UNIQUE " : "";
    out.push(`CREATE ${unique}INDEX ${quote(idx.name)} ON ${quote(table.name)} (${idx.columns.map(quote).join(", ")});`);
  }
  return out;
}

export const postgresDialect: Dialect = {
  name: "postgres",
  quote,
  columnType,
  createTable: (table: IRTable) => createTable(table),
  alterOps: (ops: any[]) => {
    const out: string[] = [];
    for (const op of ops) {
      switch (op.kind) {
        case "dropTable":
          out.push(`DROP TABLE ${quote(op.table)};`);
          break;
        case "addColumn":
          out.push(`ALTER TABLE ${quote(op.table)} ADD COLUMN ${columnDef(op.column, op.col)};`);
          break;
        case "dropColumn":
          out.push(`ALTER TABLE ${quote(op.table)} DROP COLUMN ${quote(op.column)};`);
          break;
        case "renameColumn":
          out.push(`ALTER TABLE ${quote(op.table)} RENAME COLUMN ${quote(op.from)} TO ${quote(op.to)};`);
          break;
        case "renameTable":
          out.push(`ALTER TABLE ${quote(op.from)} RENAME TO ${quote(op.to)};`);
          break;
        case "addIndex":
          out.push(`CREATE INDEX ${quote(op.index)} ON ${quote(op.table)} (${op.idx.columns.map(quote).join(", ")});`);
          break;
        case "dropIndex":
          out.push(`DROP INDEX ${quote(op.index)};`);
          break;
        case "alterColumn": {
          const newCol = op.newCol as IRColumn;
          out.push(`ALTER TABLE ${quote(op.table)} ALTER COLUMN ${quote(op.column)} TYPE ${columnType(newCol)} USING ${quote(op.column)}::${columnType(newCol)};`);
          if (op.newCol?.notNull && !op.oldCol?.notNull) {
            out.push(`ALTER TABLE ${quote(op.table)} ALTER COLUMN ${quote(op.column)} SET NOT NULL;`);
          }
          if (!op.newCol?.notNull && op.oldCol?.notNull) {
            out.push(`ALTER TABLE ${quote(op.table)} ALTER COLUMN ${quote(op.column)} DROP NOT NULL;`);
          }
          break;
        }
        default:
          break;
      }
    }
    return out;
  },
};