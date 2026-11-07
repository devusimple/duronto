import type { Column } from "./column.js";
import { ref } from "./column.js";
import type { ReferentialAction } from "./ir.js";

export type AnyColumn = Column<any, boolean, boolean>;

export interface ConstraintDescriptor {
  kind: "pk" | "unique" | "index" | "check" | "fk";
  columns: AnyColumn[];
  unique?: boolean;
  name?: string;
  checkExpr?: string;
  refThunk?: () => AnyColumn | AnyColumn[];
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
  refColumns?: AnyColumn[];
}

export function primaryKey(cols: AnyColumn | AnyColumn[]): ConstraintDescriptor {
  const arr = Array.isArray(cols) ? cols : [cols];
  return { kind: "pk", columns: arr };
}

export function unique(cols: AnyColumn | AnyColumn[]): ConstraintDescriptor {
  const arr = Array.isArray(cols) ? cols : [cols];
  return { kind: "unique", columns: arr };
}

export function index(cols: AnyColumn | AnyColumn[], opts?: { unique?: boolean; name?: string }): ConstraintDescriptor {
  const arr = Array.isArray(cols) ? cols : [cols];
  const desc: ConstraintDescriptor = { kind: "index", columns: arr };
  if (opts?.unique !== undefined) desc.unique = opts.unique;
  if (opts?.name !== undefined) desc.name = opts.name;
  return desc;
}

export function check(expr: string): ConstraintDescriptor {
  return { kind: "check", columns: [], checkExpr: expr };
}

export function foreignKey(
  cols: AnyColumn | AnyColumn[],
  refThunk: () => AnyColumn | AnyColumn[],
  options?: { onDelete?: ReferentialAction; onUpdate?: ReferentialAction },
): ConstraintDescriptor {
  const arr = Array.isArray(cols) ? cols : [cols];
  return {
    kind: "fk",
    columns: arr,
    refThunk,
    onDelete: options?.onDelete ?? "no action",
    onUpdate: options?.onUpdate ?? "no action",
  };
}

export class TableImpl<Cols extends Record<string, AnyColumn> = Record<string, AnyColumn>> {
  readonly __brand = "Table" as const;
  readonly tableName: string;
  readonly columns: Cols;
  readonly constraints: ConstraintDescriptor[];

  constructor(name: string, columns: Cols, constraints: ConstraintDescriptor[] = []) {
    this.tableName = name;
    this.columns = columns;
    this.constraints = constraints;
    // expose columns as top-level properties for ref(() => table.column) ergonomics
    for (const [k, v] of Object.entries(columns)) {
      (this as Record<string, unknown>)[k] = v;
    }
  }
}

export type Table<Cols extends Record<string, AnyColumn> = Record<string, AnyColumn>> = TableImpl<Cols> & Cols;

export function isTable(value: unknown): value is TableImpl<any> {
  return typeof value === "object" && value !== null && (value as { __brand?: string }).__brand === "Table";
}

export function table<Cols extends Record<string, AnyColumn>>(
  name: string,
  columns: Cols,
  constraintsCb?: (t: Cols) => Record<string, ConstraintDescriptor | ConstraintDescriptor[]>,
): TableImpl<Cols> & Cols;
export function table<Cols extends Record<string, AnyColumn>>(
  name: string,
  columns: Cols,
  constraintsCb?: (t: Cols) => Record<string, ConstraintDescriptor | ConstraintDescriptor[]>,
): TableImpl<Cols> {
  let constraints: ConstraintDescriptor[] = [];
  if (constraintsCb) {
    const res = constraintsCb(columns);
    for (const v of Object.values(res)) {
      if (Array.isArray(v)) constraints = constraints.concat(v);
      else constraints.push(v);
    }
  }
  return new TableImpl(name, columns, constraints) as TableImpl<Cols> & Cols;
}

export function junction(
  name: string,
  cols: Record<string, () => AnyColumn>,
  options?: { onDelete?: ReferentialAction; onUpdate?: ReferentialAction },
): Table<Record<string, AnyColumn>> {
  const onDelete = options?.onDelete ?? "no action";
  const onUpdate = options?.onUpdate ?? "no action";
  const columns: Record<string, AnyColumn> = {};
  for (const key of Object.keys(cols)) {
    const thunk = cols[key]!;
    columns[key] = ref(thunk, { onDelete, onUpdate }).notNull().name(`${key}_id`) as AnyColumn;
  }
  const allCols = Object.values(columns);
  const tbl = new TableImpl(name, columns, [primaryKey(allCols)]);
  return tbl as Table<Record<string, AnyColumn>>;
}
