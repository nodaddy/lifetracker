export type Database = {
  public: {
    Tables: {
      financial_assets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          current_value: number;
          invested_amount: number | null;
          goal_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category: string;
          current_value: number;
          invested_amount?: number | null;
          goal_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          current_value?: number;
          invested_amount?: number | null;
          goal_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_asset_events: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string | null;
          action: "create" | "update" | "delete";
          before_value: number | null;
          after_value: number | null;
          payload_before: Record<string, unknown> | null;
          payload_after: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id?: string | null;
          action: "create" | "update" | "delete";
          before_value?: number | null;
          after_value?: number | null;
          payload_before?: Record<string, unknown> | null;
          payload_after?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          before_value?: number | null;
          after_value?: number | null;
          payload_before?: Record<string, unknown> | null;
          payload_after?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      financial_goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_portfolio_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          total_current_value: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date?: string;
          total_current_value: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          total_current_value?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
