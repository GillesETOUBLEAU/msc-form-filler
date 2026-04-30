"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult =
  | { data: { id: string }; error: null }
  | { data: null; error: string };

export async function addContact(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const prenom = formData.get("prenom") as string;
  const nom = formData.get("nom") as string;
  const telephone = formData.get("telephone") as string;

  if (!email || !prenom || !nom || !telephone) {
    return { data: null, error: "Email, prénom, nom et téléphone sont requis." };
  }

  if (prenom.length > 15 || nom.length > 15) {
    return {
      data: null,
      error: "Le formulaire MSC limite prénom et nom à 15 caractères.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("msc_newsletter_contacts")
    .insert({ email, prenom, nom, telephone })
    .select("id")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/");
  return { data: { id: data.id }, error: null };
}
