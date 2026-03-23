"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-red-400">Erreur : {error.message}</p>
      <button
        onClick={reset}
        className="rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
      >
        Réessayer
      </button>
    </div>
  );
}
