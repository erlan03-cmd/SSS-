"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportActions() {
  return <div className="flex gap-2 print:hidden"><Button asChild variant="outline"><a href="/admin/reports/export"><Download /> Excel / CSV</a></Button><Button type="button" onClick={() => window.print()}><Printer /> PDF / печать</Button></div>;
}
