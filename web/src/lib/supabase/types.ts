import type { ChartResult, ComparisonResult } from '../astrology/contracts';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      practitioner_profiles: {
        Row: {
          user_id: string; display_name: string; professional_title: string;
          email: string; phone: string; website: string; footer_text: string;
          app_settings: Json; created_at: string; updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['practitioner_profiles']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['practitioner_profiles']['Row']>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string; owner_id: string; name: string; birth_date: string | null;
          email: string; phone: string; notes: string; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
        Relationships: [];
      };
      charts: {
        Row: {
          id: string; owner_id: string; client_id: string | null; subject_name: string;
          birth_date: string | null; local_time: string | null; location_name: string;
          timezone_name: string; latitude: number | null; longitude: number | null;
          classic_result: Json; modern_result: Json; comparison_result: Json;
          schema_version: number; created_at: string; updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['charts']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['charts']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface TypedChartRow {
  id: string;
  schema_version: 1;
  classic_result: ChartResult;
  modern_result: ChartResult;
  comparison_result: ComparisonResult;
}
