import { NextResponse } from "next/server";
import { destroyEmployeeSession } from "@/lib/employee-auth";

export async function GET(request: Request) {
  await destroyEmployeeSession();
  return NextResponse.redirect(new URL("/cash/login", request.url));
}
