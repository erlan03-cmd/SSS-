import { AdminNav } from "@/components/admin-nav";
import { assertAdmin } from "@/lib/admin-auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdmin();

  return (
    <main className="min-h-screen">
      <AdminNav />
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">{children}</div>
    </main>
  );
}
