import { Card } from "@/components/ui/Card";

interface StatsCardsProps {
  stats: Record<string, number>;
}

const STATUS_CONFIG = [
  { key: "pending", label: "En attente", color: "text-yellow-400" },
  { key: "processing", label: "En cours", color: "text-blue-400" },
  { key: "done", label: "Terminés", color: "text-green-400" },
  { key: "error", label: "Erreurs", color: "text-red-400" },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <Card>
        <p className="text-sm text-gray-400">Total</p>
        <p className="mt-1 text-2xl font-bold">{total}</p>
      </Card>
      {STATUS_CONFIG.map(({ key, label, color }) => (
        <Card key={key}>
          <p className="text-sm text-gray-400">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>
            {stats[key] ?? 0}
          </p>
        </Card>
      ))}
    </div>
  );
}
