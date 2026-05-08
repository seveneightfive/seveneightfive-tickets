// Auto-generate this file with: supabase gen types typescript --linked > src/types/database.ts
// This stub satisfies the TypeScript compiler while types are being generated.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string | null;
          venue: string | null;
          cover_image_url: string | null;
          slug: string | null;
          organizer_user_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
      };
      ticket_types: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          capacity: number | null;
          quantity_sold: number;
          is_active: boolean;
          stripe_price_id: string | null;
          sale_starts_at: string | null;
          sale_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ticket_types"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["ticket_types"]["Row"]>;
      };
      attendees: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendees"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["attendees"]["Row"]>;
      };
      ticket_sales: {
        Row: {
          id: string;
          event_id: string;
          ticket_type_id: string;
          attendee_id: string | null;
          quantity: number;
          unit_price_cents: number;
          total_cents: number;
          platform_fee_cents: number;
          stripe_session_id: string | null;
          stripe_payment_intent: string | null;
          status: "pending" | "paid" | "refunded" | "cancelled";
          qr_code_secret: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ticket_sales"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["ticket_sales"]["Row"]>;
      };
      checkins: {
        Row: {
          id: string;
          event_id: string;
          ticket_sale_id: string;
          checked_in_at: string;
          checked_in_by: string | null;
          device_id: string | null;
          synced_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["checkins"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["checkins"]["Row"]>;
      };
      donations: {
        Row: {
          id: string;
          event_id: string;
          attendee_id: string | null;
          amount_cents: number;
          message: string | null;
          is_anonymous: boolean;
          stripe_payment_intent: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["donations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["donations"]["Row"]>;
      };
      merchandise: {
        Row: {
          id: string;
          event_id: string | null;
          name: string;
          description: string | null;
          price_cents: number;
          image_url: string | null;
          inventory: number | null;
          stripe_price_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["merchandise"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["merchandise"]["Row"]>;
      };
      merch_orders: {
        Row: {
          id: string;
          attendee_id: string | null;
          merchandise_id: string;
          quantity: number;
          total_cents: number;
          stripe_session_id: string | null;
          status: "pending" | "paid" | "shipped" | "cancelled";
          shipping_address: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["merch_orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["merch_orders"]["Row"]>;
      };
      reviews: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          rating: number;
          body: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
      };
      comments: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          parent_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
      };
      live_streams: {
        Row: {
          id: string;
          event_id: string;
          mux_stream_id: string | null;
          mux_playback_id: string | null;
          status: "scheduled" | "active" | "ended";
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["live_streams"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["live_streams"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          event_id: string | null;
          type: string;
          title: string;
          body: string | null;
          data: Json | null;
          is_read: boolean;
          onesignal_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      analytics_events: {
        Row: {
          id: number;
          event_id: string | null;
          user_id: string | null;
          session_id: string | null;
          name: string;
          properties: Json | null;
          occurred_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["analytics_events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Row"]>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
