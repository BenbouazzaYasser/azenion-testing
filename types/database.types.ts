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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_announcements: {
        Row: {
          author_id: string
          body: string | null
          branch_id: string
          created_at: string | null
          id: string
          image_url: string | null
          images: Json
          title: string
          updated_at: string | null
          videos: Json
        }
        Insert: {
          author_id: string
          body?: string | null
          branch_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          title: string
          updated_at?: string | null
          videos?: Json
        }
        Update: {
          author_id?: string
          body?: string | null
          branch_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          title?: string
          updated_at?: string | null
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "branch_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_announcements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_events: {
        Row: {
          branch_id: string
          cover_url: string | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          registration_url: string | null
          schedule: string | null
          starts_at: string | null
          title: string
          updated_at: string | null
          videos: Json
          visibility: string
        }
        Insert: {
          branch_id: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          registration_url?: string | null
          schedule?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string | null
          videos?: Json
          visibility?: string
        }
        Update: {
          branch_id?: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          registration_url?: string | null
          schedule?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string | null
          videos?: Json
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_highlights: {
        Row: {
          branch_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          link_url: string | null
          sort_order: number
          title: string
          videos: Json
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          sort_order?: number
          title: string
          videos?: Json
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          sort_order?: number
          title?: string
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "branch_highlights_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_leaders: {
        Row: {
          assigned_by: string | null
          branch_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          branch_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          branch_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_managers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_managers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_members: {
        Row: {
          branch_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          branch_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          city: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      call_events: {
        Row: {
          call_id: string
          conversation_id: string
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          sender_id: string
        }
        Insert: {
          call_id: string
          conversation_id: string
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json
          sender_id: string
        }
        Update: {
          call_id?: string
          conversation_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_events_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_attachments: {
        Row: {
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          external_id: string | null
          file_size: number | null
          filename: string | null
          id: string
          message_id: string
          metadata: Json
          mime_type: string | null
          provider: string | null
          storage_path: string | null
          type: string
          uploader_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          message_id: string
          metadata?: Json
          mime_type?: string | null
          provider?: string | null
          storage_path?: string | null
          type: string
          uploader_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          external_id?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          message_id?: string
          metadata?: Json
          mime_type?: string | null
          provider?: string | null
          storage_path?: string | null
          type?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_attachments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "update_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          archived_at: string | null
          conversation_id: string
          deleted_at: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          conversation_id: string
          deleted_at?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          conversation_id?: string
          deleted_at?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          member_a: string | null
          member_b: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_a?: string | null
          member_b?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          member_a?: string | null
          member_b?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_member_a_fkey"
            columns: ["member_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_member_b_fkey"
            columns: ["member_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_labs: {
        Row: {
          added_by: string | null
          course_id: string
          created_at: string
          lab_id: string
        }
        Insert: {
          added_by?: string | null
          course_id: string
          created_at?: string
          lab_id: string
        }
        Update: {
          added_by?: string | null
          course_id?: string
          created_at?: string
          lab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_labs_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_labs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_labs_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          content_type: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          difficulty: string | null
          duration: string | null
          file_path: string
          file_url: string
          id: string
          is_free: boolean
          price_cents: number
          status: string
          tags: string[] | null
          thumbnail: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content_type: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          file_path: string
          file_url: string
          id?: string
          is_free?: boolean
          price_cents?: number
          status?: string
          tags?: string[] | null
          thumbnail?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          file_path?: string
          file_url?: string
          id?: string
          is_free?: boolean
          price_cents?: number
          status?: string
          tags?: string[] | null
          thumbnail?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_config: {
        Row: {
          appeal_days: number
          id: boolean
        }
        Insert: {
          appeal_days?: number
          id?: boolean
        }
        Update: {
          appeal_days?: number
          id?: boolean
        }
        Relationships: []
      }
      ecosystem_config: {
        Row: {
          id: boolean
          ownership_cooldown_days: number
          project_archive_days: number
          project_inactive_days: number
          team_hidden_days: number
          team_inactive_days: number
        }
        Insert: {
          id?: boolean
          ownership_cooldown_days?: number
          project_archive_days?: number
          project_inactive_days?: number
          team_hidden_days?: number
          team_inactive_days?: number
        }
        Update: {
          id?: boolean
          ownership_cooldown_days?: number
          project_archive_days?: number
          project_inactive_days?: number
          team_hidden_days?: number
          team_inactive_days?: number
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          course_id: string
          expires_at: string | null
          id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          course_id: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          course_id?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_pins: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          feed_key: string | null
          id: string
          post_id: string
          project_id: string | null
          scope: string
          team_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          feed_key?: string | null
          id?: string
          post_id: string
          project_id?: string | null
          scope: string
          team_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          feed_key?: string | null
          id?: string
          post_id?: string
          project_id?: string | null
          scope?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_pins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_pins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_pins_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_pins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_pins_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_applications: {
        Row: {
          audit_note: string | null
          created_at: string
          id: string
          profile_id: string
          status: string
        }
        Insert: {
          audit_note?: string | null
          created_at?: string
          id?: string
          profile_id: string
          status?: string
        }
        Update: {
          audit_note?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_profiles: {
        Row: {
          id: string
          profile_id: string
          trust_level: number
          verified_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          trust_level?: number
          verified_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          trust_level?: number
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_submissions: {
        Row: {
          answers: Json | null
          created_at: string
          evaluated_at: string | null
          feedback_url: string | null
          id: string
          lab_id: string
          lab_version_id: string
          score: number | null
          started_at: string
          status: string
          submission_url: string | null
          submitted_at: string | null
          test_results: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          evaluated_at?: string | null
          feedback_url?: string | null
          id?: string
          lab_id: string
          lab_version_id: string
          score?: number | null
          started_at?: string
          status?: string
          submission_url?: string | null
          submitted_at?: string | null
          test_results?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          evaluated_at?: string | null
          feedback_url?: string | null
          id?: string
          lab_id?: string
          lab_version_id?: string
          score?: number | null
          started_at?: string
          status?: string
          submission_url?: string | null
          submitted_at?: string | null
          test_results?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_submissions_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_submissions_lab_version_id_fkey"
            columns: ["lab_version_id"]
            isOneToOne: false
            referencedRelation: "lab_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_versions: {
        Row: {
          answer_key: Json | null
          content: Json | null
          created_at: string
          created_by: string
          id: string
          instructions_url: string | null
          lab_id: string
          resources_url: string | null
          solution_url: string | null
          starter_code_url: string | null
          test_file_url: string | null
          version_number: number
        }
        Insert: {
          answer_key?: Json | null
          content?: Json | null
          created_at?: string
          created_by: string
          id?: string
          instructions_url?: string | null
          lab_id: string
          resources_url?: string | null
          solution_url?: string | null
          starter_code_url?: string | null
          test_file_url?: string | null
          version_number: number
        }
        Update: {
          answer_key?: Json | null
          content?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          instructions_url?: string | null
          lab_id?: string
          resources_url?: string | null
          solution_url?: string | null
          starter_code_url?: string | null
          test_file_url?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_versions_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          difficulty: string
          estimated_duration_minutes: number | null
          id: string
          is_published: boolean | null
          published_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          difficulty: string
          estimated_duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          estimated_duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_attendees: {
        Row: {
          id: string
          joined_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          format: string
          host_id: string
          host_type: string
          id: string
          instructor: string
          location: string | null
          meeting_url: string | null
          starts_at: string
          status: string
          title: string
          topics: string[]
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          format?: string
          host_id: string
          host_type: string
          id?: string
          instructor?: string
          location?: string | null
          meeting_url?: string | null
          starts_at: string
          status?: string
          title: string
          topics?: string[]
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          format?: string
          host_id?: string
          host_type?: string
          id?: string
          instructor?: string
          location?: string | null
          meeting_url?: string | null
          starts_at?: string
          status?: string
          title?: string
          topics?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          edited_at: string | null
          id: string
          image_url: string | null
          message_type: string
          metadata: Json | null
          received_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          message_type?: string
          metadata?: Json | null
          received_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          message_type?: string
          metadata?: Json | null
          received_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          read: boolean | null
          target_id: string | null
          target_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          target_id?: string | null
          target_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          target_id?: string | null
          target_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocation_type: string
          amount_cents: number
          beneficiary_type: string
          beneficiary_user_id: string
          course_id: string
          created_at: string
          id: string
          payment_id: string
          payout_status: string
        }
        Insert: {
          allocation_type: string
          amount_cents: number
          beneficiary_type?: string
          beneficiary_user_id: string
          course_id: string
          created_at?: string
          id?: string
          payment_id: string
          payout_status?: string
        }
        Update: {
          allocation_type?: string
          amount_cents?: number
          beneficiary_type?: string
          beneficiary_user_id?: string
          course_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          payout_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_beneficiary_user_id_fkey"
            columns: ["beneficiary_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          course_id: string | null
          created_at: string
          currency: string
          id: string
          provider: string
          provider_data: Json
          status: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_data?: Json
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_data?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          details: string[] | null
          emoji: string
          id: string
          published_at: string
          title: string
        }
        Insert: {
          badge?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          details?: string[] | null
          emoji?: string
          id?: string
          published_at?: string
          title: string
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          details?: string[] | null
          emoji?: string
          id?: string
          published_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          post_id: string
          recipient_id: string
          sharer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          post_id: string
          recipient_id: string
          sharer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          post_id?: string
          recipient_id?: string
          sharer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_sharer_id_fkey"
            columns: ["sharer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          session_token: string | null
          viewer_id: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          post_id: string
          session_token?: string | null
          viewer_id?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          session_token?: string | null
          viewer_id?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string
          images: Json
          source_id: string | null
          source_type: string
          title: string
          updated_at: string | null
          videos: Json
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          images?: Json
          source_id?: string | null
          source_type: string
          title?: string
          updated_at?: string | null
          videos?: Json
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          images?: Json
          source_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string | null
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          deletion_requested_at: string | null
          deletion_scheduled_at: string | null
          full_name: string
          github_url: string | null
          id: string
          institution: string | null
          linkedin_url: string | null
          onboarding_completed_at: string | null
          onboarding_step: string | null
          skills: string[] | null
          team_owner_cooldown_until: string | null
          updated_at: string | null
          username: string
          welcome_email_sent: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          full_name: string
          github_url?: string | null
          id: string
          institution?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          skills?: string[] | null
          team_owner_cooldown_until?: string | null
          updated_at?: string | null
          username: string
          welcome_email_sent?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_at?: string | null
          full_name?: string
          github_url?: string | null
          id?: string
          institution?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          skills?: string[] | null
          team_owner_cooldown_until?: string | null
          updated_at?: string | null
          username?: string
          welcome_email_sent?: boolean | null
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      project_category_members: {
        Row: {
          category_id: string
          project_id: string
        }
        Insert: {
          category_id: string
          project_id: string
        }
        Update: {
          category_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_category_members_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_category_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          joined_at: string | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string
          body: string | null
          created_at: string | null
          id: string
          image_url: string | null
          images: Json
          project_id: string
          title: string
          updated_at: string | null
          videos: Json
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          project_id: string
          title: string
          updated_at?: string | null
          videos?: Json
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          project_id?: string
          title?: string
          updated_at?: string | null
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          description_long: string | null
          github_url: string | null
          id: string
          last_activity_at: string
          lifecycle_status: string
          logo_url: string | null
          name: string
          owner_id: string
          recruitment: Json | null
          slug: string
          team_id: string
          technologies: string[] | null
          updated_at: string | null
          visibility: string
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          description_long?: string | null
          github_url?: string | null
          id?: string
          last_activity_at?: string
          lifecycle_status?: string
          logo_url?: string | null
          name: string
          owner_id: string
          recruitment?: Json | null
          slug: string
          team_id: string
          technologies?: string[] | null
          updated_at?: string | null
          visibility?: string
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          description_long?: string | null
          github_url?: string | null
          id?: string
          last_activity_at?: string
          lifecycle_status?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          recruitment?: Json | null
          slug?: string
          team_id?: string
          technologies?: string[] | null
          updated_at?: string | null
          visibility?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          allocation_id: string
          amount_cents: number
          created_at: string
          id: string
          reason: string | null
          status: string
        }
        Insert: {
          allocation_id: string
          amount_cents: number
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
        }
        Update: {
          allocation_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "payment_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          preferred_branch_id: string | null
          preferred_format: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          preferred_branch_id?: string | null
          preferred_format?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          preferred_branch_id?: string | null
          preferred_format?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_requests_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_categories: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      team_category_members: {
        Row: {
          category_id: string
          team_id: string
        }
        Insert: {
          category_id: string
          team_id: string
        }
        Update: {
          category_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_category_members_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "team_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_category_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          invited_user_id: string
          status: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          invited_user_id: string
          status?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          invited_user_id?: string
          status?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_join_requests: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_roles: {
        Row: {
          created_at: string
          member_id: string
          role_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          member_id: string
          role_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          member_id?: string
          role_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_open_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          quantity: number
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          quantity?: number
          team_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          quantity?: number
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_open_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_roles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_updates: {
        Row: {
          author_id: string
          body: string | null
          created_at: string | null
          id: string
          image_url: string | null
          images: Json
          team_id: string
          title: string
          updated_at: string | null
          videos: Json
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          team_id: string
          title: string
          updated_at?: string | null
          videos?: Json
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          team_id?: string
          title?: string
          updated_at?: string | null
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "team_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_updates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          banner_url: string | null
          branch_id: string | null
          created_at: string | null
          description: string | null
          id: string
          last_activity_at: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          status: string
          technologies: string[] | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          banner_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_activity_at?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          status?: string
          technologies?: string[] | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          banner_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_activity_at?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          status?: string
          technologies?: string[] | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      update_comments: {
        Row: {
          body: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          target_id: string
          target_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          target_id: string
          target_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "update_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      update_likes: {
        Row: {
          created_at: string | null
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          notifications: Json
          privacy: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notifications?: Json
          privacy?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notifications?: Json
          privacy?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string | null
          provider: string
          provider_data: Json
          status: string
        }
        Insert: {
          event_type: string
          id?: string
          processed_at?: string | null
          provider: string
          provider_data?: Json
          status?: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string | null
          provider?: string
          provider_data?: Json
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      feed_items: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          image_url: string | null
          source_id: string | null
          source_type: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_grant_role: {
        Args: { p_role_name: string; p_user_id: string }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: { p_role_name: string; p_user_id: string }
        Returns: undefined
      }
      assign_branch_leader: {
        Args: { p_branch_id: string; p_user_id: string }
        Returns: undefined
      }
      assign_member_roles: {
        Args: { p_member_id: string; p_role_ids: string[]; p_team_id: string }
        Returns: undefined
      }
      can_access_chat_media: { Args: { p_path: string }; Returns: boolean }
      can_access_course: { Args: { course_id: string }; Returns: boolean }
      can_access_private_media: {
        Args: { p_path: string; p_user_id?: string }
        Returns: boolean
      }
      can_manage_announcements: { Args: never; Returns: boolean }
      can_manage_chat_media: { Args: { p_path: string }; Returns: boolean }
      can_manage_course: { Args: { course_id: string }; Returns: boolean }
      can_manage_live_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      can_manage_live_session_host: {
        Args: { p_host_id: string; p_host_type: string }
        Returns: boolean
      }
      can_manage_private_media: { Args: { p_path: string }; Returns: boolean }
      can_manage_session_requests: { Args: never; Returns: boolean }
      can_publish_course: { Args: { course_id: string }; Returns: boolean }
      cancel_account_deletion: { Args: never; Returns: undefined }
      cancel_friend_request: { Args: { p_receiver_id: string }; Returns: Json }
      claim_welcome_email: { Args: { p_user_id: string }; Returns: boolean }
      compute_project_lifecycle: {
        Args: { p_last_activity_at: string }
        Returns: string
      }
      create_branch: {
        Args: {
          p_city?: string
          p_description?: string
          p_institution?: string
          p_logo_url?: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      create_branch_announcement: {
        Args: {
          p_body?: string
          p_branch_id: string
          p_image_url?: string
          p_is_pinned?: boolean
          p_title: string
        }
        Returns: string
      }
      create_branch_event: {
        Args: {
          p_branch_id: string
          p_cover_url?: string
          p_description?: string
          p_ends_at?: string
          p_location?: string
          p_registration_url?: string
          p_schedule?: string
          p_starts_at?: string
          p_title: string
          p_visibility?: string
        }
        Returns: string
      }
      create_branch_highlight: {
        Args: {
          p_branch_id: string
          p_description?: string
          p_image_url?: string
          p_link_url?: string
          p_sort_order?: number
          p_title: string
        }
        Returns: string
      }
      create_live_session: {
        Args: {
          p_capacity?: number
          p_description: string
          p_ends_at: string
          p_format?: string
          p_host_id: string
          p_host_type: string
          p_instructor: string
          p_location?: string
          p_meeting_url?: string
          p_starts_at: string
          p_title: string
          p_topics?: string[]
        }
        Returns: string
      }
      create_platform_announcement: {
        Args: {
          p_badge: string
          p_category: string
          p_description: string
          p_details: string[]
          p_emoji: string
          p_title: string
        }
        Returns: string
      }
      create_project: {
        Args: {
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_slug: string
          p_team_id: string
          p_visibility?: string
        }
        Returns: string
      }
      create_session_request: {
        Args: {
          p_description: string
          p_preferred_branch_id: string
          p_preferred_format: string
          p_title: string
        }
        Returns: string
      }
      create_team: {
        Args: {
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_slug: string
          p_visibility?: string
        }
        Returns: string
      }
      create_team_role: {
        Args: { p_color?: string; p_name: string; p_team_id: string }
        Returns: string
      }
      delete_branch: { Args: { p_branch_id: string }; Returns: undefined }
      delete_branch_announcement: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      delete_branch_event: { Args: { p_event_id: string }; Returns: undefined }
      delete_branch_highlight: {
        Args: { p_highlight_id: string }
        Returns: undefined
      }
      delete_live_session: { Args: { p_id: string }; Returns: undefined }
      delete_platform_announcement: {
        Args: { p_id: string }
        Returns: undefined
      }
      delete_project: { Args: { p_project_id: string }; Returns: undefined }
      delete_storage_prefix: {
        Args: { p_bucket: string; p_prefix: string }
        Returns: undefined
      }
      delete_team: { Args: { p_team_id: string }; Returns: undefined }
      delete_team_role: { Args: { p_role_id: string }; Returns: undefined }
      follow_user: { Args: { p_target_id: string }; Returns: Json }
      get_all_session_requests: {
        Args: never
        Returns: {
          admin_notes: string
          branch_name: string
          created_at: string
          description: string
          id: string
          preferred_branch_id: string
          preferred_format: string
          requester_avatar_url: string
          requester_full_name: string
          requester_username: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_branch_feed_posts: {
        Args: {
          p_branch_id: string
          p_page?: number
          p_page_size?: number
          p_source_ids: string[]
          p_viewer?: string
        }
        Returns: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string
          images: Json
          source_id: string | null
          source_type: string
          title: string
          updated_at: string | null
          videos: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_call_peer: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_featured_projects: {
        Args: { p_limit?: number; p_window_days?: number }
        Returns: {
          id: string
          likes_count: number
          reactions_count: number
          score: number
          updates_count: number
        }[]
      }
      get_global_feed_posts: {
        Args: {
          p_filter?: string
          p_page?: number
          p_page_size?: number
          p_viewer?: string
        }
        Returns: {
          author_id: string | null
          body: string | null
          created_at: string | null
          id: string
          images: Json
          source_id: string | null
          source_type: string
          title: string
          updated_at: string | null
          videos: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_live_sessions: {
        Args: never
        Returns: {
          attendee_count: number
          capacity: number
          created_at: string
          created_by: string
          description: string
          duration_minutes: number
          ends_at: string
          format: string
          host_id: string
          host_name: string
          host_type: string
          id: string
          instructor: string
          joined: boolean
          location: string
          meeting_url: string
          seats_remaining: number
          starts_at: string
          status: string
          title: string
          topics: string[]
          updated_at: string
        }[]
      }
      get_login_email_by_username: {
        Args: { p_username: string }
        Returns: string
      }
      get_manageable_session_hosts: {
        Args: never
        Returns: {
          host_id: string
          host_name: string
          host_type: string
        }[]
      }
      get_my_session_requests: {
        Args: never
        Returns: {
          admin_notes: string
          branch_name: string
          created_at: string
          description: string
          id: string
          preferred_branch_id: string
          preferred_format: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_my_team_invitations: {
        Args: never
        Returns: {
          created_at: string
          id: string
          invited_by_full_name: string
          invited_by_username: string
          status: string
          team_id: string
          team_logo_url: string
          team_name: string
          team_slug: string
        }[]
      }
      get_my_team_request_status: {
        Args: { p_team_id: string }
        Returns: string
      }
      get_or_create_conversation: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_public_profile: { Args: { p_username: string }; Returns: Json }
      get_relationship_state: { Args: { p_target_id: string }; Returns: Json }
      get_team_invitations: {
        Args: { p_team_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          invited_by_username: string
          invited_user_id: string
          status: string
          team_id: string
          username: string
        }[]
      }
      get_team_join_requests: {
        Args: { p_team_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          institution: string
          message: string
          status: string
          team_id: string
          user_id: string
          username: string
        }[]
      }
      get_team_member_roles: {
        Args: { p_team_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          member_id: string
          role_ids: string[]
          role_names: string[]
          username: string
        }[]
      }
      get_team_roles: {
        Args: { p_team_id: string }
        Returns: {
          color: string
          created_at: string
          id: string
          member_count: number
          name: string
          permissions: string[]
          team_id: string
          updated_at: string
        }[]
      }
      get_trending_feed: {
        Args: { p_limit?: number; p_viewer?: string; p_window_days?: number }
        Returns: {
          author_id: string
          body: string
          created_at: string
          id: string
          images: Json
          score: number
          source_id: string
          source_type: string
          title: string
          updated_at: string
        }[]
      }
      get_trending_teams: {
        Args: { p_limit?: number; p_window_days?: number }
        Returns: {
          id: string
          likes_count: number
          members_count: number
          posts_count: number
          score: number
        }[]
      }
      get_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_user_platform_roles: {
        Args: { p_user_id: string }
        Returns: {
          assigned_at: string
          description: string
          is_system: boolean
          name: string
          role_id: string
        }[]
      }
      get_user_teams: {
        Args: { p_user_id: string }
        Returns: {
          role: string
          team_id: string
          team_logo_url: string
          team_name: string
          team_slug: string
        }[]
      }
      get_users_that_blocked_me: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      grant_platform_role: {
        Args: { p_role_name: string; p_user_id: string }
        Returns: undefined
      }
      has_platform_role: {
        Args: { p_role_name: string; p_user_id?: string }
        Returns: boolean
      }
      has_team_permission: {
        Args: { p_permission: string; p_team_id: string; p_user_id?: string }
        Returns: boolean
      }
      invite_team_member: {
        Args: { p_email?: string; p_team_id: string; p_username?: string }
        Returns: undefined
      }
      is_blocked_by_conversation_peer: {
        Args: { p_conversation_id: string; p_sender_id?: string }
        Returns: boolean
      }
      is_branch_leader: {
        Args: { p_branch_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_course_manager: { Args: never; Returns: boolean }
      is_feed_post_visible: {
        Args: { p_source_id: string; p_source_type: string; p_user_id?: string }
        Returns: boolean
      }
      is_instructor: { Args: never; Returns: boolean }
      is_lab_creator: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_relationship_blocked: {
        Args: { p_actor_id: string; p_target_id: string }
        Returns: boolean
      }
      is_safe_http_url: { Args: { p_value: string }; Returns: boolean }
      is_team_leader: {
        Args: { p_team_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { p_team_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { p_blocked_id: string; p_blocker_id: string }
        Returns: boolean
      }
      is_verified_instructor: { Args: never; Returns: boolean }
      join_branch: { Args: { p_branch_id: string }; Returns: undefined }
      join_live_session: {
        Args: { p_session_id: string }
        Returns: {
          attendee_count: number
          capacity: number
          joined: boolean
        }[]
      }
      join_project: { Args: { p_project_id: string }; Returns: undefined }
      join_team: { Args: { p_team_id: string }; Returns: undefined }
      leave_branch: { Args: never; Returns: undefined }
      leave_live_session: { Args: { p_session_id: string }; Returns: undefined }
      leave_project: { Args: { p_project_id: string }; Returns: undefined }
      leave_team: { Args: { p_team_id: string }; Returns: undefined }
      mark_messages_received: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      reactivate_team: { Args: { p_team_id: string }; Returns: undefined }
      record_post_view: {
        Args: {
          p_post_id: string
          p_session_token?: string
          p_viewer_id?: string
        }
        Returns: boolean
      }
      refresh_all_lifecycles: { Args: never; Returns: number }
      refresh_project_lifecycle: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      refresh_team_status: { Args: { p_team_id: string }; Returns: undefined }
      remove_branch_leader: {
        Args: { p_branch_id: string; p_user_id: string }
        Returns: undefined
      }
      remove_member: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: string }
      request_team_join: {
        Args: { p_message?: string; p_team_id: string }
        Returns: undefined
      }
      reset_welcome_email_claim: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      respond_friend_request: {
        Args: { p_accept: boolean; p_sender_id: string }
        Returns: Json
      }
      respond_to_invitation: {
        Args: { p_accept: boolean; p_invitation_id: string }
        Returns: undefined
      }
      restore_project: { Args: { p_project_id: string }; Returns: undefined }
      review_team_join_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: undefined
      }
      revoke_platform_role: {
        Args: { p_role_name: string; p_user_id: string }
        Returns: undefined
      }
      safe_activity_metadata: { Args: { p_metadata: Json }; Returns: Json }
      search_users: {
        Args: { p_limit?: number; p_query?: string; p_viewer?: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          institution: string
          username: string
        }[]
      }
      send_friend_request: { Args: { p_receiver_id: string }; Returns: Json }
      set_role_permissions: {
        Args: { p_permissions: string[]; p_role_id: string }
        Returns: undefined
      }
      share_post: {
        Args: { p_message?: string; p_post_id: string; p_recipient_id: string }
        Returns: Json
      }
      sweep_pending_deletions: { Args: never; Returns: number }
      toggle_feed_pin: {
        Args: {
          p_branch_id?: string
          p_post_id: string
          p_project_id?: string
          p_scope: string
          p_team_id?: string
        }
        Returns: undefined
      }
      touch_project: { Args: { p_project_id: string }; Returns: undefined }
      touch_team: { Args: { p_team_id: string }; Returns: undefined }
      transfer_project_ownership: {
        Args: { p_new_owner_id: string; p_project_id: string }
        Returns: undefined
      }
      transfer_team_ownership: {
        Args: { p_new_owner_id: string; p_team_id: string }
        Returns: undefined
      }
      trending_weights: { Args: never; Returns: Json }
      unfollow_user: { Args: { p_target_id: string }; Returns: Json }
      unfriend: { Args: { p_target_id: string }; Returns: Json }
      update_branch: {
        Args: {
          p_branch_id: string
          p_city?: string
          p_description?: string
          p_institution?: string
          p_logo_url?: string
          p_name?: string
          p_slug?: string
        }
        Returns: undefined
      }
      update_branch_announcement: {
        Args: {
          p_announcement_id: string
          p_body?: string
          p_image_url?: string
          p_is_pinned?: boolean
          p_title?: string
        }
        Returns: undefined
      }
      update_branch_announcement_image: {
        Args: { p_announcement_id: string; p_image_url: string }
        Returns: undefined
      }
      update_branch_event: {
        Args: {
          p_cover_url?: string
          p_description?: string
          p_ends_at?: string
          p_event_id: string
          p_location?: string
          p_registration_url?: string
          p_schedule?: string
          p_starts_at?: string
          p_title?: string
          p_visibility?: string
        }
        Returns: undefined
      }
      update_branch_highlight: {
        Args: {
          p_description?: string
          p_highlight_id: string
          p_image_url?: string
          p_link_url?: string
          p_sort_order?: number
          p_title?: string
        }
        Returns: undefined
      }
      update_live_session: {
        Args: {
          p_capacity?: number
          p_description: string
          p_ends_at: string
          p_format?: string
          p_host_id: string
          p_host_type: string
          p_id: string
          p_instructor: string
          p_location?: string
          p_meeting_url?: string
          p_starts_at: string
          p_title: string
          p_topics?: string[]
        }
        Returns: undefined
      }
      update_member_role: {
        Args: { p_role: string; p_team_id: string; p_user_id: string }
        Returns: undefined
      }
      update_platform_announcement: {
        Args: {
          p_badge?: string
          p_category?: string
          p_description?: string
          p_details?: string[]
          p_emoji?: string
          p_id: string
          p_title?: string
        }
        Returns: undefined
      }
      update_project_logo: {
        Args: { p_logo_url: string; p_project_id: string }
        Returns: undefined
      }
      update_session_request_status: {
        Args: { p_admin_notes?: string; p_id: string; p_status: string }
        Returns: undefined
      }
      update_team:
        | {
            Args: {
              p_banner_url?: string
              p_category_id?: string
              p_description?: string
              p_logo_url?: string
              p_name?: string
              p_slug?: string
              p_team_id: string
              p_visibility?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_banner_url?: string
              p_category_id?: string
              p_description?: string
              p_logo_url?: string
              p_name?: string
              p_slug?: string
              p_team_id: string
              p_technologies?: string[]
              p_visibility?: string
            }
            Returns: undefined
          }
      update_team_appearance: {
        Args: { p_banner_url?: string; p_logo_url?: string; p_team_id: string }
        Returns: undefined
      }
      update_team_information: {
        Args: {
          p_description?: string
          p_name?: string
          p_slug?: string
          p_team_id: string
          p_technologies?: string[]
          p_visibility?: string
        }
        Returns: undefined
      }
      update_team_role: {
        Args: { p_color?: string; p_name?: string; p_role_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
