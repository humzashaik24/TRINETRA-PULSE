import * as React from 'react';
import { cn } from '../lib/utils';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
}

function TableInner<T extends Record<string, unknown>>(
  { columns, data, onRowClick, emptyMessage = 'No data', className, compact }: TableProps<T>,
  _ref: React.Ref<HTMLTableElement>
) {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin', className)}>
      <table ref={_ref} className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  'text-left text-overline text-foreground-muted uppercase tracking-wider',
                  compact ? 'px-3 py-2' : 'px-4 py-2.5',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={cn(
                  'text-center text-sm text-foreground-muted py-8',
                )}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-border-subtle tp-transition',
                  onRowClick && 'cursor-pointer hover:bg-surface-hover'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      compact ? 'px-3 py-2' : 'px-4 py-3',
                      'text-sm text-foreground',
                      col.mono && 'font-mono text-code',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.render
                      ? col.render(row[col.key] as T[keyof T], row)
                      : (row[col.key] as React.ReactNode) ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const Table = React.forwardRef(TableInner) as <T extends Record<string, unknown>>(
  props: TableProps<T> & { ref?: React.Ref<HTMLTableElement> }
) => React.ReactElement;

export { Table };
export type { Column, TableProps };
