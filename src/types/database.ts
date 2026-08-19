// Database types - simplified for MVP
// Run `npx supabase gen types typescript --local > src/types/database.ts` after migrations

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          subscription_tier: "free" | "single" | "pro";
          subscription_expires: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: "free" | "single" | "pro";
          subscription_expires?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: "free" | "single" | "pro";
          subscription_expires?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          source_type: "figma" | "url" | "files";
          source_url: string | null;
          figma_file_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          source_type: "figma" | "url" | "files";
          source_url?: string | null;
          figma_file_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          source_type?: "figma" | "url" | "files";
          source_url?: string | null;
          figma_file_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      versions: {
        Row: {
          id: string;
          project_id: string;
          version_num: number;
          status: "processing" | "ready" | "failed";
          screenshots: Json | null;
          screenshot_urls: string[] | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          version_num: number;
          status?: "processing" | "ready" | "failed";
          screenshots?: Json | null;
          screenshot_urls?: string[] | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          version_num?: number;
          status?: "processing" | "ready" | "failed";
          screenshots?: Json | null;
          screenshot_urls?: string[] | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          version_id: string;
          criteria_scores: Json;
          issues: Json;
          checklist: Json;
          overall_score: number;
          pdf_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          version_id: string;
          criteria_scores: Json;
          issues: Json;
          checklist: Json;
          overall_score: number;
          pdf_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          version_id?: string;
          criteria_scores?: Json;
          issues?: Json;
          checklist?: Json;
          overall_score?: number;
          pdf_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      comparisons: {
        Row: {
          id: string;
          project_id: string;
          v1_version_id: string;
          v2_version_id: string;
          diff: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          v1_version_id: string;
          v2_version_id: string;
          diff: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          v1_version_id?: string;
          v2_version_id?: string;
          diff?: Json;
          created_at?: string;
        };
      };
      share_links: {
        Row: {
          id: string;
          report_id: string;
          token: string;
          title: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          token: string;
          title: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          token?: string;
          title?: string;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          user_id: string;
          messages: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          user_id?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: "free" | "single" | "pro";
          provider: "yookassa" | "stripe";
          provider_sub_id: string | null;
          status: "active" | "canceled" | "past_due" | "trialing";
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier: "free" | "single" | "pro";
          provider: "yookassa" | "stripe";
          provider_sub_id?: string | null;
          status?: "active" | "canceled" | "past_due" | "trialing";
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tier?: "free" | "single" | "pro";
          provider?: "yookassa" | "stripe";
          provider_sub_id?: string | null;
          status?: "active" | "canceled" | "past_due" | "trialing";
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      subscription_tier: "free" | "single" | "pro";
      source_type: "figma" | "url" | "files";
      version_status: "processing" | "ready" | "failed";
      subscription_status: "active" | "canceled" | "past_due" | "trialing";
      payment_provider: "yookassa" | "stripe";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"],
  TableName extends PublicTableNameOrOptions = PublicTableNameOrOptions,
> = Database["public"]["Tables"][TableName] extends {
  Row: infer R;
}
  ? R
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"],
  TableName extends PublicTableNameOrOptions = PublicTableNameOrOptions,
> = Database["public"]["Tables"][TableName] extends {
  Insert: infer I;
}
  ? I
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"],
  TableName extends PublicTableNameOrOptions = PublicTableNameOrOptions,
> = Database["public"]["Tables"][TableName] extends {
  Update: infer U;
}
  ? U
  : never;