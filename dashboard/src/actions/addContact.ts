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
  const telephone = (formData.get("telephone") as string) || null;
  const date_naissance = (formData.get("date_naissance") as string) || null;
  const experience_navigation =
    (formData.get("experience_navigation") as string) || null;
  const destination = (formData.get("destination") as string) || null;

  if (!email || !prenom || !nom) {
    return { data: null, error: "Email, prénom et nom sont requis." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("msc_newsletter_contacts")
    .insert({
      email,
      prenom,
      nom,
      telephone,
      date_naissance,
      experience_navigation,
      destination,
    })
    .select("id")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/");
  return { data: { id: data.id }, error: null };
}
