import { cn } from "@/lib/utils/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-800 bg-gray-900 p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
