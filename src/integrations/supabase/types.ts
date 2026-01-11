export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_type: string
          event_id: string | null
          floorplan_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type: string
          event_id?: string | null
          floorplan_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string
          event_id?: string | null
          floorplan_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_floorplan_id_fkey"
            columns: ["floorplan_id"]
            isOneToOne: false
            referencedRelation: "floorplans"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          company_name: string
          contact_name: string
          created_account_id: string | null
          created_at: string
          email: string
          id: string
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_account_id?: string | null
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_account_id?: string | null
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_requests_created_account_id_fkey"
            columns: ["created_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_documents: {
        Row: {
          created_at: string
          event_id: string
          file_url: string
          filename: string
          id: string
          language: Database["public"]["Enums"]["document_language"]
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          file_url: string
          filename: string
          id?: string
          language: Database["public"]["Enums"]["document_language"]
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          file_url?: string
          filename?: string
          id?: string
          language?: Database["public"]["Enums"]["document_language"]
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          permissions_override: Json | null
          role: Database["public"]["Enums"]["event_role"]
          user_id: string
          visible_tiles: Json | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          permissions_override?: Json | null
          role?: Database["public"]["Enums"]["event_role"]
          user_id: string
          visible_tiles?: Json | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          permissions_override?: Json | null
          role?: Database["public"]["Enums"]["event_role"]
          user_id?: string
          visible_tiles?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          account_id: string | null
          created_at: string
          end_date: string | null
          id: string
          location: string | null
          name: string
          public_request_token: string | null
          public_requests_enabled: boolean
          start_date: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          public_request_token?: string | null
          public_requests_enabled?: boolean
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          public_request_token?: string | null
          public_requests_enabled?: boolean
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_library: {
        Row: {
          account_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          vat: string | null
        }
        Insert: {
          account_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vat?: string | null
        }
        Update: {
          account_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_library_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_services: {
        Row: {
          carpet_included: boolean
          construction_booked: boolean
          created_at: string
          exhibitor_id: string
          id: string
          light_points: number
          notes: string | null
          power_option: Database["public"]["Enums"]["power_option"]
          surface_type: Database["public"]["Enums"]["surface_type"]
          updated_at: string
          water_connections: number
        }
        Insert: {
          carpet_included?: boolean
          construction_booked?: boolean
          created_at?: string
          exhibitor_id: string
          id?: string
          light_points?: number
          notes?: string | null
          power_option?: Database["public"]["Enums"]["power_option"]
          surface_type?: Database["public"]["Enums"]["surface_type"]
          updated_at?: string
          water_connections?: number
        }
        Update: {
          carpet_included?: boolean
          construction_booked?: boolean
          created_at?: string
          exhibitor_id?: string
          id?: string
          light_points?: number
          notes?: string | null
          power_option?: Database["public"]["Enums"]["power_option"]
          surface_type?: Database["public"]["Enums"]["surface_type"]
          updated_at?: string
          water_connections?: number
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_services_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: true
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitors: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          event_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          vat: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vat?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      floorplan_templates: {
        Row: {
          account_id: string | null
          background_opacity: number | null
          background_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          grid_size: number
          height: number
          id: string
          name: string
          stands_data: Json | null
          updated_at: string
          width: number
        }
        Insert: {
          account_id?: string | null
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grid_size?: number
          height?: number
          id?: string
          name: string
          stands_data?: Json | null
          updated_at?: string
          width?: number
        }
        Update: {
          account_id?: string | null
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grid_size?: number
          height?: number
          id?: string
          name?: string
          stands_data?: Json | null
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "floorplan_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      floorplans: {
        Row: {
          background_opacity: number | null
          background_url: string | null
          created_at: string
          event_id: string
          grid_size: number
          hall: string | null
          height: number
          id: string
          name: string
          updated_at: string
          width: number
        }
        Insert: {
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          event_id: string
          grid_size?: number
          hall?: string | null
          height?: number
          id?: string
          name: string
          updated_at?: string
          width?: number
        }
        Update: {
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          event_id?: string
          grid_size?: number
          hall?: string | null
          height?: number
          id?: string
          name?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "floorplans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string | null
          created_at: string
          email: string
          global_module_visibility: Json | null
          id: string
          is_account_admin: boolean | null
          name: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          email: string
          global_module_visibility?: Json | null
          id: string
          is_account_admin?: boolean | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          email?: string
          global_module_visibility?: Json | null
          id?: string
          is_account_admin?: boolean | null
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["system_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["system_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["system_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      stand_requests: {
        Row: {
          carpet_included: boolean
          company_name: string
          construction_booked: boolean
          contact_name: string
          created_at: string
          created_exhibitor_id: string | null
          email: string
          event_id: string
          id: string
          light_points: number
          notes: string | null
          phone: string | null
          power_option: Database["public"]["Enums"]["power_option"]
          processed_at: string | null
          processed_by: string | null
          requested_area: number | null
          requested_height: number | null
          requested_stand_label: string | null
          requested_width: number | null
          status: Database["public"]["Enums"]["request_status"]
          surface_type: Database["public"]["Enums"]["surface_type"]
          updated_at: string
          vat: string | null
          water_connections: number
        }
        Insert: {
          carpet_included?: boolean
          company_name: string
          construction_booked?: boolean
          contact_name: string
          created_at?: string
          created_exhibitor_id?: string | null
          email: string
          event_id: string
          id?: string
          light_points?: number
          notes?: string | null
          phone?: string | null
          power_option?: Database["public"]["Enums"]["power_option"]
          processed_at?: string | null
          processed_by?: string | null
          requested_area?: number | null
          requested_height?: number | null
          requested_stand_label?: string | null
          requested_width?: number | null
          status?: Database["public"]["Enums"]["request_status"]
          surface_type?: Database["public"]["Enums"]["surface_type"]
          updated_at?: string
          vat?: string | null
          water_connections?: number
        }
        Update: {
          carpet_included?: boolean
          company_name?: string
          construction_booked?: boolean
          contact_name?: string
          created_at?: string
          created_exhibitor_id?: string | null
          email?: string
          event_id?: string
          id?: string
          light_points?: number
          notes?: string | null
          phone?: string | null
          power_option?: Database["public"]["Enums"]["power_option"]
          processed_at?: string | null
          processed_by?: string | null
          requested_area?: number | null
          requested_height?: number | null
          requested_stand_label?: string | null
          requested_width?: number | null
          status?: Database["public"]["Enums"]["request_status"]
          surface_type?: Database["public"]["Enums"]["surface_type"]
          updated_at?: string
          vat?: string | null
          water_connections?: number
        }
        Relationships: [
          {
            foreignKeyName: "stand_requests_created_exhibitor_id_fkey"
            columns: ["created_exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stand_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      stands: {
        Row: {
          color: string | null
          created_at: string
          event_id: string
          exhibitor_id: string | null
          floorplan_id: string
          height: number
          id: string
          label: string
          notes: string | null
          rotation: number
          status: string
          updated_at: string
          width: number
          x: number
          y: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          event_id: string
          exhibitor_id?: string | null
          floorplan_id: string
          height?: number
          id?: string
          label: string
          notes?: string | null
          rotation?: number
          status?: string
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          event_id?: string
          exhibitor_id?: string | null
          floorplan_id?: string
          height?: number
          id?: string
          label?: string
          notes?: string | null
          rotation?: number
          status?: string
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "stands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stands_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stands_floorplan_id_fkey"
            columns: ["floorplan_id"]
            isOneToOne: false
            referencedRelation: "floorplans"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          event_id: string | null
          granted: boolean
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          granted?: boolean
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          granted?: boolean
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["system_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["system_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["system_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_event_with_defaults: {
        Args: {
          _end_date: string
          _location: string
          _name: string
          _start_date: string
        }
        Returns: {
          account_id: string | null
          created_at: string
          end_date: string | null
          id: string
          location: string | null
          name: string
          public_request_token: string | null
          public_requests_enabled: boolean
          start_date: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_account_id: { Args: { _user_id: string }; Returns: string }
      has_event_permission: {
        Args: { _event_id: string; _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _event_id?: string; _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_system_role: {
        Args: {
          _role: Database["public"]["Enums"]["system_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_admin: { Args: { _user_id: string }; Returns: boolean }
      is_event_member: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_module_visible: {
        Args: { _module_name: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_system_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tile_visible: {
        Args: { _event_id: string; _tile_name: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      document_language: "NL" | "FR" | "EN" | "DE"
      document_type: "TERMS"
      event_role: "ADMIN" | "USER"
      power_option:
        | "NONE"
        | "WATT_500"
        | "WATT_2000"
        | "WATT_3500"
        | "AMP_16A"
        | "AMP_32A"
      request_status: "NEW" | "APPROVED" | "REJECTED" | "PROCESSED"
      surface_type: "EMPTY" | "EMPTY_WITH_CARPET" | "WITH_CONSTRUCTION"
      system_role: "ADMIN" | "MANAGER" | "BUILDER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_language: ["NL", "FR", "EN", "DE"],
      document_type: ["TERMS"],
      event_role: ["ADMIN", "USER"],
      power_option: [
        "NONE",
        "WATT_500",
        "WATT_2000",
        "WATT_3500",
        "AMP_16A",
        "AMP_32A",
      ],
      request_status: ["NEW", "APPROVED", "REJECTED", "PROCESSED"],
      surface_type: ["EMPTY", "EMPTY_WITH_CARPET", "WITH_CONSTRUCTION"],
      system_role: ["ADMIN", "MANAGER", "BUILDER"],
    },
  },
} as const
