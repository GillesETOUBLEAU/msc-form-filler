import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/features/StatsCards";
import { RecentActivity } from "@/components/features/RecentActivity";
import { ErrorList } from "@/components/features/ErrorList";
import { AddContactForm } from "@/components/features/AddContactForm";
import type { MscNewsletterContact } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Stats by status
  const { data: allContacts } = await supabase
    .from("msc_newsletter_contacts")
    .select("status");

  const stats: Record<string, number> = {};
  for (const row of allContacts ?? []) {
    stats[row.status] = (stats[row.status] ?? 0) + 1;
  }

  // Recent activity (last 20 processed)
  const { data: recent } = await supabase
    .from("msc_newsletter_contacts")
    .select("*")
    .in("status", ["done", "error", "processing"])
    .order("processed_at", { ascending: false, nullsFirst: false })
    .limit(20);

  // Errors only
  const { data: errors } = await supabase
    .from("msc_newsletter_contacts")
    .select("*")
    .eq("status", "error")
    .order("processed_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-300">
          Vue d&apos;ensemble
        </h2>
        <StatsCards stats={stats} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-300">
          Activité récente
        </h2>
        <RecentActivity
          contacts={(recent as MscNewsletterContact[]) ?? []}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-300">Erreurs</h2>
        <ErrorList errors={(errors as MscNewsletterContact[]) ?? []} />
      </section>

      <section>
        <AddContactForm />
      </section>
    </div>
  );
}
