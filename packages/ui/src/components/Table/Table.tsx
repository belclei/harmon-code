import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

export type TableProps = TableHTMLAttributes<HTMLTableElement>;

/** Harmon's base data table (index.html id="tabela"). Purely presentational — pass real `<thead>`/`<tbody>` markup via `TableHead`/`TableBody`/`TableRow`/`TableHeaderCell`/`TableCell`. */
export function Table({ className = "", ...rest }: TableProps) {
  return (
    <table
      {...rest}
      className={["w-full border-collapse text-[.875rem]", className].join(" ")}
    />
  );
}

export type TableHeadProps = HTMLAttributes<HTMLTableSectionElement>;

export function TableHead(props: TableHeadProps) {
  return <thead {...props} />;
}

export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

export function TableBody(props: TableBodyProps) {
  return <tbody {...props} />;
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement>;

/** A body row — carries the hover wash; header rows use a plain `<tr>` instead (index.html only ever hovers `tbody` rows). */
export function TableRow({ className = "", ...rest }: TableRowProps) {
  return (
    <tr
      {...rest}
      className={[
        "border-b border-[var(--lr-border)] transition-colors duration-150 hover:bg-[var(--lr-surface-sunken)]",
        className,
      ].join(" ")}
    />
  );
}

export interface TableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-aligns, mono, tabular-nums — the value column (index.html `.num`). */
  numeric?: boolean;
}

export function TableHeaderCell({
  numeric = false,
  className = "",
  ...rest
}: TableHeaderCellProps) {
  return (
    <th
      {...rest}
      className={[
        "whitespace-nowrap border-b border-[var(--lr-border)] px-3 py-2.5 font-normal",
        "text-[.6875rem] tracking-[.16em] text-[var(--lr-label)] uppercase",
        numeric ? "text-right" : "text-left",
        className,
      ].join(" ")}
    />
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Right-aligns, mono, tabular-nums — the value column (index.html `.num`). */
  numeric?: boolean;
}

export function TableCell({
  numeric = false,
  className = "",
  ...rest
}: TableCellProps) {
  return (
    <td
      {...rest}
      className={[
        "px-3 py-3 text-[var(--lr-text)]",
        numeric
          ? "text-right font-mono [font-variant-numeric:tabular-nums]"
          : "",
        className,
      ].join(" ")}
    />
  );
}
