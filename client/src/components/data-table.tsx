import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: keyof T;
  label: string;
  align?: "left" | "right" | "center";
  format?: (value: any) => string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  className = "",
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }
    
    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortDirection === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  return (
    <div className={`rounded-md border border-border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-card hover:bg-card border-b border-border">
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={`text-${column.align || "left"} font-medium text-muted-foreground`}
              >
                {column.sortable !== false ? (
                  <button
                    data-testid={`sort-${String(column.key)}`}
                    onClick={() => handleSort(column.key)}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    {column.label}
                    {sortColumn === column.key ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={index}
              className={index % 2 === 0 ? "bg-background" : "bg-card/30"}
              data-testid={`row-${index}`}
            >
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  className={`text-${column.align || "left"} ${
                    typeof row[column.key] === "number" ? "font-mono tabular-nums" : ""
                  }`}
                >
                  {column.format ? column.format(row[column.key]) : String(row[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
