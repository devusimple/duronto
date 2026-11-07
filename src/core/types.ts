import type { Table, TableImpl } from "./table.js";
import type { Column, ColumnData, ColumnNotNull, ColumnHasDefault } from "./column.js";

export type InferColumnSelect<C extends Column<any, any, any>> =
  C extends Column<infer D, infer N, any>
    ? (N extends true ? D : D | null)
    : never;

export type InferColumnInsert<C extends Column<any, any, any>> =
  C extends Column<infer D, infer N, infer H>
    ? (N extends true ? D : D | null)
    : never;

// Simpler explicit optional handling is done at object level.

export type InferSelect<T> =
  T extends TableImpl<infer Cols>
    ? { [K in keyof Cols]: InferColumnSelect<Cols[K]> }
    : never;

export type InferInsert<T> =
  T extends TableImpl<infer Cols>
    ? {
        [K in keyof Cols as ColumnHasDefault<Cols[K]> extends true
          ? K
          : ColumnNotNull<Cols[K]> extends true
            ? never
            : K]?: InferColumnInsert<Cols[K]>;
      } & {
        [K in keyof Cols as ColumnHasDefault<Cols[K]> extends true
          ? never
          : ColumnNotNull<Cols[K]> extends true
            ? K
            : never]: InferColumnInsert<Cols[K]>;
      }
    : never;

export type InferUpdate<T> =
  T extends TableImpl<infer Cols>
    ? { [K in keyof Cols]?: InferColumnSelect<Cols[K]> }
    : never;
