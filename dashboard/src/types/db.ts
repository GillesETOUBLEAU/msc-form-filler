export interface MscNewsletterContact {
  id: string;
  created_at: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  status: "pending" | "processing" | "done" | "error";
  processed_at: string | null;
  process_details: string | null;
  quiz_answers: (string | null)[] | null;
  profile_letter: "A" | "B" | "C" | "D" | null;
  profiling_consent: boolean | null;
}

export interface Database {
  public: {
    Tables: {
      msc_newsletter_contacts: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          prenom: string;
          nom: string;
          telephone: string;
          status: string;
          processed_at: string | null;
          process_details: string | null;
          quiz_answers: unknown | null;
          profile_letter: string | null;
          profiling_consent: boolean | null;
        };
        Insert: {
          email: string;
          prenom: string;
          nom: string;
          telephone: string;
          id?: string;
          created_at?: string;
          status?: string;
          processed_at?: string | null;
          process_details?: string | null;
          quiz_answers?: unknown | null;
          profile_letter?: string | null;
          profiling_consent?: boolean | null;
        };
        Update: {
          email?: string;
          prenom?: string;
          nom?: string;
          telephone?: string;
          status?: string;
          processed_at?: string | null;
          process_details?: string | null;
          quiz_answers?: unknown | null;
          profile_letter?: string | null;
          profiling_consent?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
