"use client";

import { useActionState } from "react";
import { addContact } from "@/actions/addContact";
import { Card } from "@/components/ui/Card";

type State = { error: string | null; success: boolean };

async function action(
  _prev: State,
  formData: FormData
): Promise<State> {
  const result = await addContact(formData);
  if (result.error) return { error: result.error, success: false };
  return { error: null, success: true };
}

export function AddContactForm() {
  const [state, formAction, isPending] = useActionState(action, {
    error: null,
    success: false,
  });

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold">Ajouter un contact</h3>

      {state.success && (
        <p className="mb-4 rounded bg-green-900/50 px-3 py-2 text-sm text-green-300">
          Contact ajouté avec succès !
        </p>
      )}
      {state.error && (
        <p className="mb-4 rounded bg-red-900/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-gray-400">
            Email <span className="text-red-400">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-400">
            Prénom <span className="text-red-400">*</span>
          </span>
          <input
            name="prenom"
            type="text"
            required
            maxLength={15}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-400">
            Nom <span className="text-red-400">*</span>
          </span>
          <input
            name="nom"
            type="text"
            required
            maxLength={15}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-gray-400">
            Téléphone <span className="text-red-400">*</span>
          </span>
          <input
            name="telephone"
            type="tel"
            required
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {isPending ? "Ajout en cours..." : "Ajouter le contact"}
          </button>
        </div>
      </form>
    </Card>
  );
}
