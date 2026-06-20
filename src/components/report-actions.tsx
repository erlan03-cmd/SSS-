"use client";

import { DatabaseBackup, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportActions({ days }: { days: number }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button asChild variant="outline">
        <a href={`/admin/reports/export?days=${days}`}>
          <Download /> Excel / CSV
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href="/admin/backup">
          <DatabaseBackup /> Резервная копия
        </a>
      </Button>
      <Button type="button" onClick={() => window.print()}>
        <Printer /> PDF / печать
      </Button>
    </div>
  );
}
