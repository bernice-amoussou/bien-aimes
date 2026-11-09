/**
 * Types de la base, écrits à la main pour refléter supabase/schema.sql.
 * Après création du projet, ils peuvent être régénérés avec :
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts
 */

export type TeamRole = "admin" | "member";
export type SermonLanguageEnum = "fr" | "en";
/** Emplacement d'un fichier audio : Cloudflare R2, ou ancien bucket Supabase (migration). */
export type StorageProvider = "r2" | "supabase";

export type SermonRow = {
  id: string;
  preached_on: string;
  title: string;
  scripture_references: string[];
  notes: string | null;
  language: SermonLanguageEnum;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AudioFileRow = {
  id: string;
  sermon_id: string;
  name: string;
  storage_path: string;
  storage_provider: StorageProvider;
  duration_seconds: number | null;
  format: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_downloadable: boolean;
  position: number;
  created_at: string;
};

export type TeamMemberRow = {
  user_id: string;
  email: string | null;
  role: TeamRole;
  created_at: string;
};

/** Arguments de la fonction SQL `save_sermon`. */
export type SaveSermonPayload = {
  id: string;
  preached_on: string;
  title: string;
  scripture_references: string[];
  notes: string | null;
  language: SermonLanguageEnum;
  is_published: boolean;
};

export type SaveAudioPayload = {
  /** Présent pour un fichier déjà enregistré, absent pour un nouveau. */
  id?: string;
  name: string;
  storage_path: string;
  duration_seconds: number | null;
  format: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_downloadable: boolean;
};

type Insert<Row, Optional extends keyof Row> = Omit<Row, Optional> & Partial<Pick<Row, Optional>>;

export interface Database {
  public: {
    Tables: {
      sermons: {
        Row: SermonRow;
        Insert: Insert<
          SermonRow,
          "id" | "notes" | "language" | "is_published" | "created_by" | "created_at" | "updated_at"
        >;
        Update: Partial<SermonRow>;
        Relationships: [];
      };
      audio_files: {
        Row: AudioFileRow;
        Insert: Insert<
          AudioFileRow,
          | "id"
          | "storage_provider"
          | "duration_seconds"
          | "mime_type"
          | "size_bytes"
          | "is_downloadable"
          | "position"
          | "created_at"
        >;
        Update: Partial<AudioFileRow>;
        Relationships: [
          {
            foreignKeyName: "audio_files_sermon_id_fkey";
            columns: ["sermon_id"];
            isOneToOne: false;
            referencedRelation: "sermons";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: TeamMemberRow;
        Insert: Insert<TeamMemberRow, "email" | "role" | "created_at">;
        Update: Partial<TeamMemberRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_team_member: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      save_sermon: {
        Args: { p_sermon: SaveSermonPayload; p_audio: SaveAudioPayload[] };
        Returns: {
          id: string;
          removed_paths: string[];
          removed_files: { storage_path: string; storage_provider: StorageProvider }[];
        };
      };
      mark_audio_migrated: { Args: { p_id: string }; Returns: boolean };
    };
    Enums: {
      team_role: TeamRole;
      sermon_language: SermonLanguageEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}
