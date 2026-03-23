import type { MscNewsletterContact } from "@/types/db";
import { Card } from "@/components/ui/Card";

interface RecentActivityProps {
  contacts: MscNewsletterContact[];
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-900 text-yellow-300",
  processing: "bg-blue-900 text-blue-300",
  done: "bg-green-900 text-green-300",
  error: "bg-red-900 text-red-300",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentActivity({ contacts }: RecentActivityProps) {
  if (contacts.length === 0) {
    return (
      <Card>
        <p className="text-gray-500">Aucune activité récente.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-2 pr-4">Nom</th>
            <th className="pb-2 pr-4">Email</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Traité le</th>
            <th className="pb-2">Détails</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} className="border-b border-gray-800/50">
              <td className="py-2 pr-4 font-medium">
                {c.prenom} {c.nom}
              </td>
              <td className="py-2 pr-4 text-gray-400">{c.email}</td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}
                >
                  {c.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-400">
                {formatDate(c.processed_at)}
              </td>
              <td className="py-2 max-w-48 truncate text-gray-500">
                {c.process_details ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
