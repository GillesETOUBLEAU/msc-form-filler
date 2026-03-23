import type { MscNewsletterContact } from "@/types/db";
import { Card } from "@/components/ui/Card";

interface ErrorListProps {
  errors: MscNewsletterContact[];
}

export function ErrorList({ errors }: ErrorListProps) {
  if (errors.length === 0) {
    return (
      <Card>
        <p className="text-gray-500">Aucune erreur.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {errors.map((c) => (
        <Card key={c.id} className="border-red-900/50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                {c.prenom} {c.nom}{" "}
                <span className="text-gray-500">&lt;{c.email}&gt;</span>
              </p>
              <p className="mt-1 text-sm text-red-400">
                {c.process_details ?? "Erreur inconnue"}
              </p>
            </div>
            <span className="shrink-0 text-xs text-gray-500">
              {c.processed_at
                ? new Date(c.processed_at).toLocaleString("fr-FR")
                : ""}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
