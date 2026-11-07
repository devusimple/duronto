import type { LogicalType, ReferentialAction } from "./ir.js";

export type ColumnData<C> = C extends Column<infer D, any, any> ? D : never;
export type ColumnNotNull<C> = C extends Column<any, infer N, any> ? N : false;
export type ColumnHasDefault<C> = C extends Column<any, any, infer H> ? H : false;

export interface ColumnState {
  kind: LogicalType | "ref";
  length?: number;
  enumValues?: string[];
  notNullFlag: boolean;
  hasDefaultFlag: boolean;
  uniqueFlag: boolean;
  primaryKeyFlag: boolean;
  indexFlag: boolean;
  noIndexFlag: boolean;
  checkExpr?: string;
  sqlNameOverride?: string;
  renamedFrom?: string;
  defaultVal?: unknown;
  defaultNowFlag: boolean;
  isRef: boolean;
  referencesThunk?: () => unknown;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
}

export class Column<
  TData,
  TNotNull extends boolean,
  THasDefault extends boolean,
> {
  readonly __brand = "Column" as const;
  readonly state: ColumnState;

  constructor(state: ColumnState) {
    this.state = state;
  }

  notNull(): Column<TData, true, THasDefault> {
    return new Column<TData, true, THasDefault>({ ...this.state, notNullFlag: true });
  }

  unique(): Column<TData, TNotNull, THasDefault> {
    return new Column<TData, TNotNull, THasDefault>({ ...this.state, uniqueFlag: true });
  }

  default(value: TData): Column<TData, TNotNull, true> {
    return new Column<TData, TNotNull, true>({
      ...this.state,
      hasDefaultFlag: true,
      defaultVal: value,
      defaultNowFlag: false,
    });
  }

  defaultNow(): Column<TData, TNotNull, true> {
    return new Column<TData, TNotNull, true>({
      ...this.state,
      hasDefaultFlag: true,
      defaultNowFlag: true,
    });
  }

  primaryKey(): Column<TData, true, THasDefault> {
    return new Column<TData, true, THasDefault>({
      ...this.state,
      primaryKeyFlag: true,
      notNullFlag: true,
    });
  }

  index(): Column<TData, TNotNull, THasDefault> {
    return new Column<TData, TNotNull, THasDefault>({ ...this.state, indexFlag: true });
  }

  check(expr: string): Column<TData, TNotNull, THasDefault> {
    return new Column<TData, TNotNull, THasDefault>({ ...this.state, checkExpr: expr });
  }

  name(sqlName: string): Column<TData, TNotNull, THasDefault> {
    return new Column<TData, TNotNull, THasDefault>({ ...this.state, sqlNameOverride: sqlName });
  }

  renamedFrom(old: string): Column<TData, TNotNull, THasDefault> {
    return new Column<TData, TNotNull, THasDefault>({ ...this.state, renamedFrom: old });
  }

  noIndex(): Column<TData, TNotNull, THasDefault> {
    return new Column<TData, TNotNull, THasDefault>({ ...this.state, noIndexFlag: true });
  }
}

function base<TData>(
  kind: LogicalType | "ref",
  extra: Partial<ColumnState> = {},
): Column<TData, false, false> {
  return new Column<TData, false, false>({
    kind,
    notNullFlag: false,
    hasDefaultFlag: false,
    uniqueFlag: false,
    primaryKeyFlag: false,
    indexFlag: false,
    noIndexFlag: false,
    defaultNowFlag: false,
    isRef: false,
    onDelete: "no action",
    onUpdate: "no action",
    ...extra,
  });
}

export function id(): Column<number, true, true> {
  return new Column<number, true, true>({
    kind: "id",
    notNullFlag: true,
    hasDefaultFlag: true,
    uniqueFlag: false,
    primaryKeyFlag: true,
    indexFlag: false,
    noIndexFlag: false,
    defaultNowFlag: false,
    isRef: false,
    onDelete: "no action",
    onUpdate: "no action",
  });
}

export function uuid(): Column<string, false, false> {
  return base<string>("uuid");
}

export function text(): Column<string, false, false> {
  return base<string>("text");
}

export function varchar(n: number): Column<string, false, false> {
  return base<string>("varchar", { length: n });
}

export function int(): Column<number, false, false> {
  return base<number>("int");
}

export function bigint(): Column<bigint, false, false> {
  return base<bigint>("bigint");
}

export function real(): Column<number, false, false> {
  return base<number>("real");
}

export function bool(): Column<boolean, false, false> {
  return base<boolean>("bool");
}

export function timestamp(): Column<Date, false, false> {
  return base<Date>("timestamp");
}

export function json<T = unknown>(): Column<T, false, false> {
  return base<T>("json");
}

export function enumType(values: readonly string[]): Column<(typeof values)[number], false, false> {
  return base<(typeof values)[number]>("enum", { enumValues: [...values] });
}

export function ref<C extends Column<any, any, any>>(
  thunk: () => C,
  options?: { onDelete?: ReferentialAction; onUpdate?: ReferentialAction },
): Column<ColumnData<C>, false, false> {
  const onDelete = options?.onDelete ?? "no action";
  const onUpdate = options?.onUpdate ?? "no action";
  return base<any>("ref", {
    isRef: true,
    referencesThunk: thunk as () => unknown,
    onDelete,
    onUpdate,
  }) as unknown as Column<ColumnData<C>, false, false>;
}
