export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          card_shape: string | null
          created_at: string
          due_at: string
          estimated_hours: number | null
          id: string
          module_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          title: string
          user_id: string
          weight: number | null
        }
        Insert: {
          card_shape?: string | null
          created_at?: string
          due_at: string
          estimated_hours?: number | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          title: string
          user_id: string
          weight?: number | null
        }
        Update: {
          card_shape?: string | null
          created_at?: string
          due_at?: string
          estimated_hours?: number | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          title?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          id: string
          recorded_at: string
          session_id: string
          source: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Insert: {
          id?: string
          recorded_at?: string
          session_id: string
          source?: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Update: {
          id?: string
          recorded_at?: string
          session_id?: string
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      board_event_marks: {
        Row: {
          created_at: string
          event_id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_event_marks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "board_events"
            referencedColumns: ["id"]
          },
        ]
      }
      board_events: {
        Row: {
          card_shape: string | null
          details: string | null
          visibility: string
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          pinned: boolean
          source: string
          starts_at: string
          tags: string[]
          title: string
          university_id: string | null
          user_id: string
        }
        Insert: {
          card_shape?: string | null
          details?: string | null
          visibility?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          pinned?: boolean
          source?: string
          starts_at: string
          tags?: string[]
          title: string
          university_id?: string | null
          user_id: string
        }
        Update: {
          card_shape?: string | null
          details?: string | null
          visibility?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          pinned?: boolean
          source?: string
          starts_at?: string
          tags?: string[]
          title?: string
          university_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_events_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_periods: {
        Row: {
          currency: string
          food_budget: number | null
          id: string
          kind: Database["public"]["Enums"]["budget_kind"]
          starts_at: string
          total_budget: number | null
          user_id: string
        }
        Insert: {
          currency?: string
          food_budget?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["budget_kind"]
          starts_at: string
          total_budget?: number | null
          user_id: string
        }
        Update: {
          currency?: string
          food_budget?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["budget_kind"]
          starts_at?: string
          total_budget?: number | null
          user_id?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          id: string
          lat: number | null
          lng: number | null
          name: string
          university_id: string
        }
        Insert: {
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          university_id: string
        }
        Update: {
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          building_id: string | null
          created_at: string
          ends_at: string
          external_uid: string | null
          has_submission: boolean
          id: string
          is_assessed: boolean
          is_recorded: boolean
          module_id: string
          room: string | null
          series_id: string | null
          starts_at: string
          type: Database["public"]["Enums"]["session_type"]
          user_id: string
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          ends_at: string
          external_uid?: string | null
          has_submission?: boolean
          id?: string
          is_assessed?: boolean
          is_recorded?: boolean
          module_id: string
          room?: string | null
          series_id?: string | null
          starts_at: string
          type?: Database["public"]["Enums"]["session_type"]
          user_id: string
        }
        Update: {
          building_id?: string | null
          created_at?: string
          ends_at?: string
          external_uid?: string | null
          has_submission?: boolean
          id?: string
          is_assessed?: boolean
          is_recorded?: boolean
          module_id?: string
          room?: string | null
          series_id?: string | null
          starts_at?: string
          type?: Database["public"]["Enums"]["session_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          card_shape: string | null
          id: string
          module_id: string | null
          room: string | null
          starts_at: string
          title: string
          topics: string[]
          user_id: string
        }
        Insert: {
          card_shape?: string | null
          id?: string
          module_id?: string | null
          room?: string | null
          starts_at: string
          title: string
          topics?: string[]
          user_id: string
        }
        Update: {
          card_shape?: string | null
          id?: string
          module_id?: string | null
          room?: string | null
          starts_at?: string
          title?: string
          topics?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          id: string
          note: string | null
          spent_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          amount: number
          category?: string
          id?: string
          note?: string | null
          spent_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          id?: string
          note?: string | null
          spent_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["goal_kind"]
          progress: number
          target_per_week: number | null
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          progress?: number
          target_per_week?: number | null
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          progress?: number
          target_per_week?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          attendance_required: boolean
          code: string | null
          color_token: string
          created_at: string
          credits: number | null
          id: string
          name: string
          threshold: number | null
          user_id: string
        }
        Insert: {
          attendance_required?: boolean
          code?: string | null
          color_token?: string
          created_at?: string
          credits?: number | null
          id?: string
          name: string
          threshold?: number | null
          user_id: string
        }
        Update: {
          attendance_required?: boolean
          code?: string | null
          color_token?: string
          created_at?: string
          credits?: number | null
          id?: string
          name?: string
          threshold?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          attendance_threshold: number | null
          attendance_monitored: boolean
          calendar_token: string
          campus_label: string | null
          campus_lat: number | null
          campus_lng: number | null
          created_at: string
          currency: string
          display_name: string | null
          id: string
          onboarded_at: string | null
          travel_minutes: number | null
          university_id: string | null
        }
        Insert: {
          attendance_threshold?: number | null
          attendance_monitored?: boolean
          calendar_token?: string
          campus_label?: string | null
          campus_lat?: number | null
          campus_lng?: number | null
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
          onboarded_at?: string | null
          travel_minutes?: number | null
          university_id?: string | null
        }
        Update: {
          attendance_threshold?: number | null
          attendance_monitored?: boolean
          calendar_token?: string
          campus_label?: string | null
          campus_lat?: number | null
          campus_lng?: number | null
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
          onboarded_at?: string | null
          travel_minutes?: number | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skip_decisions: {
        Row: {
          chose_to_skip: boolean | null
          decided_at: string
          id: string
          reasons: Json
          score: number
          session_id: string
          user_id: string
          verdict: Database["public"]["Enums"]["skip_verdict"]
        }
        Insert: {
          chose_to_skip?: boolean | null
          decided_at?: string
          id?: string
          reasons?: Json
          score: number
          session_id: string
          user_id: string
          verdict: Database["public"]["Enums"]["skip_verdict"]
        }
        Update: {
          chose_to_skip?: boolean | null
          decided_at?: string
          id?: string
          reasons?: Json
          score?: number
          session_id?: string
          user_id?: string
          verdict?: Database["public"]["Enums"]["skip_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "skip_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_blocks: {
        Row: {
          done: boolean
          ends_at: string
          id: string
          linked_id: string | null
          linked_type: string | null
          source: Database["public"]["Enums"]["study_block_source"]
          starts_at: string
          title: string
          user_id: string
        }
        Insert: {
          done?: boolean
          ends_at: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          source?: Database["public"]["Enums"]["study_block_source"]
          starts_at: string
          title: string
          user_id: string
        }
        Update: {
          done?: boolean
          ends_at?: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          source?: Database["public"]["Enums"]["study_block_source"]
          starts_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      university_profiles: {
        Row: {
          name_key: string
          short_key: string | null
          short_name: string | null
          attendance_threshold: number
          country: string | null
          created_at: string
          created_by: string | null
          ics_hint: string | null
          id: string
          is_public: boolean
          name: string
          term_end: string | null
          term_start: string | null
        }
        Insert: {
          name_key?: never
          short_key?: never
          short_name?: string | null
          attendance_threshold?: number
          country?: string | null
          created_at?: string
          created_by?: string | null
          ics_hint?: string | null
          id?: string
          is_public?: boolean
          name: string
          term_end?: string | null
          term_start?: string | null
        }
        Update: {
          name_key?: never
          short_key?: never
          short_name?: string | null
          attendance_threshold?: number
          country?: string | null
          created_at?: string
          created_by?: string | null
          ics_hint?: string | null
          id?: string
          is_public?: boolean
          name?: string
          term_end?: string | null
          term_start?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          created_at: string
          cuisine: string | null
          external_id: string | null
          id: string
          lat: number
          lng: number
          name: string
          price_band: number | null
          rating: number | null
        }
        Insert: {
          created_at?: string
          cuisine?: string | null
          external_id?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          price_band?: number | null
          rating?: number | null
        }
        Update: {
          created_at?: string
          cuisine?: string | null
          external_id?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          price_band?: number | null
          rating?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calendar_feed: {
        Args: { p_token: string }
        Returns: {
          kind: string
          uid: string
          title: string
          starts_at: string
          ends_at: string
          location: string | null
          description: string | null
        }[]
      }
    }
    Enums: {
      assignment_status: "not_started" | "in_progress" | "submitted" | "graded"
      attendance_source: "manual" | "checkin" | "imported"
      attendance_status: "present" | "absent" | "late" | "excused" | "unknown"
      budget_kind: "week" | "month"
      goal_kind: "habit" | "project"
      session_type:
        | "lecture"
        | "lab"
        | "seminar"
        | "tutorial"
        | "workshop"
        | "other"
      skip_verdict: "go_matters" | "go_if_you_can" | "your_call" | "skip_fine"
      study_block_source: "reclaim" | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends {
  Row: infer R
}
  ? R
  : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]
