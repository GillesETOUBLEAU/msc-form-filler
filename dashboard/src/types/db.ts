export interface MscNewsletterContact {
  id: string;
  created_at: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  date_naissance: string | null;
  experience_navigation: string | null;
  destination: string | null;
  status: "pending" | "processing" | "done" | "error";
  processed_at: string | null;
  process_details: string | null;
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
          telephone: string | null;
          date_naissance: string | null;
          experience_navigation: string | null;
          destination: string | null;
          status: string;
          processed_at: string | null;
          process_details: string | null;
        };
        Insert: {
          email: string;
          prenom: string;
          nom: string;
          telephone?: string | null;
          date_naissance?: string | null;
          experience_navigation?: string | null;
          destination?: string | null;
          id?: string;
          created_at?: string;
          status?: string;
          processed_at?: string | null;
          process_details?: string | null;
        };
        Update: {
          email?: string;
          prenom?: string;
          nom?: string;
          telephone?: string | null;
          date_naissance?: string | null;
          experience_navigation?: string | null;
          destination?: string | null;
          status?: string;
          processed_at?: string | null;
          process_details?: string | null;
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
