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
      announcement_notifications: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          display_order: number
          expires_at: string | null
          external_url: string | null
          id: string
          image_url: string | null
          link_type: string
          published: boolean
          published_at: string | null
          slug: string
          target_roles: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          display_order?: number
          expires_at?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          link_type?: string
          published?: boolean
          published_at?: string | null
          slug: string
          target_roles?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          display_order?: number
          expires_at?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          link_type?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          target_roles?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ansatt_dokumenter: {
        Row: {
          created_at: string | null
          dokument_navn: string
          dokument_type: string
          dokument_url: string
          id: string
          opprettet_av: string | null
          user_id: string
          utloper_dato: string | null
        }
        Insert: {
          created_at?: string | null
          dokument_navn: string
          dokument_type: string
          dokument_url: string
          id?: string
          opprettet_av?: string | null
          user_id: string
          utloper_dato?: string | null
        }
        Update: {
          created_at?: string | null
          dokument_navn?: string
          dokument_type?: string
          dokument_url?: string
          id?: string
          opprettet_av?: string | null
          user_id?: string
          utloper_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ansatt_dokumenter_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_dokumenter_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ansatt_godtgjorelser: {
        Row: {
          belop: number
          beskrivelse: string | null
          created_at: string | null
          frekvens: string | null
          gyldig_fra: string
          gyldig_til: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          belop: number
          beskrivelse?: string | null
          created_at?: string | null
          frekvens?: string | null
          gyldig_fra?: string
          gyldig_til?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          belop?: number
          beskrivelse?: string | null
          created_at?: string | null
          frekvens?: string | null
          gyldig_fra?: string
          gyldig_til?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ansatt_godtgjorelser_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ansatt_kurs: {
        Row: {
          created_at: string | null
          godkjent_av: string | null
          id: string
          kostnad: number | null
          kurs_navn: string
          kurs_type: string | null
          leverandor: string | null
          resultat: string | null
          sertifikat_url: string | null
          sluttdato: string | null
          startdato: string
          status: string | null
          updated_at: string | null
          user_id: string
          varighet_timer: number | null
        }
        Insert: {
          created_at?: string | null
          godkjent_av?: string | null
          id?: string
          kostnad?: number | null
          kurs_navn: string
          kurs_type?: string | null
          leverandor?: string | null
          resultat?: string | null
          sertifikat_url?: string | null
          sluttdato?: string | null
          startdato: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          varighet_timer?: number | null
        }
        Update: {
          created_at?: string | null
          godkjent_av?: string | null
          id?: string
          kostnad?: number | null
          kurs_navn?: string
          kurs_type?: string | null
          leverandor?: string | null
          resultat?: string | null
          sertifikat_url?: string | null
          sluttdato?: string | null
          startdato?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          varighet_timer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ansatt_kurs_godkjent_av_fkey"
            columns: ["godkjent_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_kurs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ansatt_mal: {
        Row: {
          budsjett_id: string | null
          created_at: string | null
          enhet: string | null
          id: string
          mal_beskrivelse: string
          mal_type: string
          mal_verdi: number | null
          oppnaadd_verdi: number | null
          opprettet_av: string | null
          periode_slutt: string | null
          periode_start: string
          salon_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budsjett_id?: string | null
          created_at?: string | null
          enhet?: string | null
          id?: string
          mal_beskrivelse: string
          mal_type: string
          mal_verdi?: number | null
          oppnaadd_verdi?: number | null
          opprettet_av?: string | null
          periode_slutt?: string | null
          periode_start: string
          salon_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budsjett_id?: string | null
          created_at?: string | null
          enhet?: string | null
          id?: string
          mal_beskrivelse?: string
          mal_type?: string
          mal_verdi?: number | null
          oppnaadd_verdi?: number | null
          opprettet_av?: string | null
          periode_slutt?: string | null
          periode_start?: string
          salon_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ansatt_mal_budsjett_id_fkey"
            columns: ["budsjett_id"]
            isOneToOne: false
            referencedRelation: "budsjett_versjoner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_mal_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_mal_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_mal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ansatt_samtaler: {
        Row: {
          created_at: string | null
          dato: string
          dokumenter_url: string[] | null
          handlingsplan: string | null
          id: string
          notater: string | null
          oppfolging_dato: string | null
          salon_id: string
          samtale_leder: string | null
          samtale_type: string
          status: string | null
          updated_at: string | null
          user_id: string
          varighet_minutter: number | null
        }
        Insert: {
          created_at?: string | null
          dato: string
          dokumenter_url?: string[] | null
          handlingsplan?: string | null
          id?: string
          notater?: string | null
          oppfolging_dato?: string | null
          salon_id: string
          samtale_leder?: string | null
          samtale_type: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          varighet_minutter?: number | null
        }
        Update: {
          created_at?: string | null
          dato?: string
          dokumenter_url?: string[] | null
          handlingsplan?: string | null
          id?: string
          notater?: string | null
          oppfolging_dato?: string | null
          salon_id?: string
          samtale_leder?: string | null
          samtale_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          varighet_minutter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ansatt_samtaler_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_samtaler_samtale_leder_fkey"
            columns: ["samtale_leder"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_samtaler_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ansatt_sertifiseringer: {
        Row: {
          created_at: string | null
          id: string
          navn: string
          sertifikat_url: string | null
          type: string | null
          user_id: string
          utloper_dato: string | null
          utsteder: string | null
          utstedt_dato: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          navn: string
          sertifikat_url?: string | null
          type?: string | null
          user_id: string
          utloper_dato?: string | null
          utsteder?: string | null
          utstedt_dato?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          navn?: string
          sertifikat_url?: string | null
          type?: string | null
          user_id?: string
          utloper_dato?: string | null
          utsteder?: string | null
          utstedt_dato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ansatt_sertifiseringer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ansatt_turnus: {
        Row: {
          created_at: string | null
          fridag: boolean | null
          gyldig_fra: string
          gyldig_til: string | null
          id: string
          salon_id: string
          slutt_tid: string | null
          start_tid: string | null
          uke_type: Database["public"]["Enums"]["turnus_uke_type"] | null
          ukedag: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fridag?: boolean | null
          gyldig_fra?: string
          gyldig_til?: string | null
          id?: string
          salon_id: string
          slutt_tid?: string | null
          start_tid?: string | null
          uke_type?: Database["public"]["Enums"]["turnus_uke_type"] | null
          ukedag: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fridag?: boolean | null
          gyldig_fra?: string
          gyldig_til?: string | null
          id?: string
          salon_id?: string
          slutt_tid?: string | null
          start_tid?: string | null
          uke_type?: Database["public"]["Enums"]["turnus_uke_type"] | null
          ukedag?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ansatt_turnus_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ansatt_turnus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string | null
          criteria_type: string
          criteria_value: number | null
          description: string | null
          icon_key: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          criteria_type: string
          criteria_value?: number | null
          description?: string | null
          icon_key: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          criteria_type?: string
          criteria_value?: number | null
          description?: string | null
          icon_key?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      budsjett: {
        Row: {
          aar: number
          arsak_null_timer:
            | Database["public"]["Enums"]["budsjett_arsak_null"]
            | null
          behandling_budsjett: number | null
          created_at: string | null
          dag: number
          dato: string
          id: string
          kundetimer: number | null
          maned: number
          planlagte_timer: number | null
          salon_id: string
          totalt_budsjett: number | null
          uke: number
          updated_at: string | null
          user_id: string
          vare_budsjett: number | null
          versjon_id: string
        }
        Insert: {
          aar: number
          arsak_null_timer?:
            | Database["public"]["Enums"]["budsjett_arsak_null"]
            | null
          behandling_budsjett?: number | null
          created_at?: string | null
          dag: number
          dato: string
          id?: string
          kundetimer?: number | null
          maned: number
          planlagte_timer?: number | null
          salon_id: string
          totalt_budsjett?: number | null
          uke: number
          updated_at?: string | null
          user_id: string
          vare_budsjett?: number | null
          versjon_id: string
        }
        Update: {
          aar?: number
          arsak_null_timer?:
            | Database["public"]["Enums"]["budsjett_arsak_null"]
            | null
          behandling_budsjett?: number | null
          created_at?: string | null
          dag?: number
          dato?: string
          id?: string
          kundetimer?: number | null
          maned?: number
          planlagte_timer?: number | null
          salon_id?: string
          totalt_budsjett?: number | null
          uke?: number
          updated_at?: string | null
          user_id?: string
          vare_budsjett?: number | null
          versjon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budsjett_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budsjett_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budsjett_versjon_id_fkey"
            columns: ["versjon_id"]
            isOneToOne: false
            referencedRelation: "budsjett_versjoner"
            referencedColumns: ["id"]
          },
        ]
      }
      budsjett_fastsatt: {
        Row: {
          created_at: string | null
          fastsatt_arsbudsjett: number
          fastsatt_behandling: number
          fastsatt_timer: number | null
          fastsatt_vare: number
          godkjent_av: string | null
          godkjent_dato: string | null
          id: string
          salon_id: string
          updated_at: string | null
          user_id: string
          versjon_id: string
        }
        Insert: {
          created_at?: string | null
          fastsatt_arsbudsjett?: number
          fastsatt_behandling?: number
          fastsatt_timer?: number | null
          fastsatt_vare?: number
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          salon_id: string
          updated_at?: string | null
          user_id: string
          versjon_id: string
        }
        Update: {
          created_at?: string | null
          fastsatt_arsbudsjett?: number
          fastsatt_behandling?: number
          fastsatt_timer?: number | null
          fastsatt_vare?: number
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          salon_id?: string
          updated_at?: string | null
          user_id?: string
          versjon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budsjett_fastsatt_godkjent_av_fkey"
            columns: ["godkjent_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budsjett_fastsatt_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budsjett_fastsatt_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budsjett_fastsatt_versjon_id_fkey"
            columns: ["versjon_id"]
            isOneToOne: false
            referencedRelation: "budsjett_versjoner"
            referencedColumns: ["id"]
          },
        ]
      }
      budsjett_versjoner: {
        Row: {
          aar: number
          beskrivelse: string | null
          created_at: string | null
          er_aktiv: boolean | null
          godkjent_av: string | null
          godkjent_dato: string | null
          id: string
          opprettet_av: string | null
          salon_id: string
          updated_at: string | null
          versjon_navn: string
          versjon_nummer: number
        }
        Insert: {
          aar: number
          beskrivelse?: string | null
          created_at?: string | null
          er_aktiv?: boolean | null
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          opprettet_av?: string | null
          salon_id: string
          updated_at?: string | null
          versjon_navn?: string
          versjon_nummer?: number
        }
        Update: {
          aar?: number
          beskrivelse?: string | null
          created_at?: string | null
          er_aktiv?: boolean | null
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          opprettet_av?: string | null
          salon_id?: string
          updated_at?: string | null
          versjon_navn?: string
          versjon_nummer?: number
        }
        Relationships: [
          {
            foreignKeyName: "budsjett_versjoner_godkjent_av_fkey"
            columns: ["godkjent_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budsjett_versjoner_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budsjett_versjoner_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      chains: {
        Row: {
          created_at: string | null
          hubspot_company_id: string | null
          hubspot_synced_at: string | null
          id: string
          logo_url: string | null
          name: string
          org_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          org_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          achieved: boolean | null
          created_at: string | null
          id: string
          month: number
          period_type: string
          progress_value: number | null
          salon_id: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          achieved?: boolean | null
          created_at?: string | null
          id?: string
          month: number
          period_type?: string
          progress_value?: number | null
          salon_id?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          achieved?: boolean | null
          created_at?: string | null
          id?: string
          month?: number
          period_type?: string
          progress_value?: number | null
          salon_id?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_module_library: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_content: Json
          default_styles: Json | null
          description: string | null
          id: string
          is_system_module: boolean | null
          name: string
          preview_image_url: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_content?: Json
          default_styles?: Json | null
          description?: string | null
          id?: string
          is_system_module?: boolean | null
          name: string
          preview_image_url?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_content?: Json
          default_styles?: Json | null
          description?: string | null
          id?: string
          is_system_module?: boolean | null
          name?: string
          preview_image_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_module_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_versions: {
        Row: {
          change_notes: string | null
          created_at: string | null
          created_by: string | null
          id: string
          structure: Json
          subject_template: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          structure: Json
          subject_template?: string | null
          template_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          structure?: Json
          subject_template?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system_template: boolean | null
          name: string
          published_at: string | null
          slug: string
          status: string
          structure: Json
          subject_template: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name: string
          published_at?: string | null
          slug: string
          status?: string
          structure?: Json
          subject_template?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system_template?: boolean | null
          name?: string
          published_at?: string | null
          slug?: string
          status?: string
          structure?: Json
          subject_template?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ferie: {
        Row: {
          aar: number
          antall_dager: number | null
          created_at: string | null
          godkjent_av: string | null
          godkjent_dato: string | null
          id: string
          kommentar: string | null
          salon_id: string
          sluttdato: string
          startdato: string
          status: Database["public"]["Enums"]["ferie_status"] | null
          timer: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aar: number
          antall_dager?: number | null
          created_at?: string | null
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          kommentar?: string | null
          salon_id: string
          sluttdato: string
          startdato: string
          status?: Database["public"]["Enums"]["ferie_status"] | null
          timer?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aar?: number
          antall_dager?: number | null
          created_at?: string | null
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          kommentar?: string | null
          salon_id?: string
          sluttdato?: string
          startdato?: string
          status?: Database["public"]["Enums"]["ferie_status"] | null
          timer?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferie_godkjent_av_fkey"
            columns: ["godkjent_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferie_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferie_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ferie_overforing: {
        Row: {
          created_at: string | null
          fra_aar: number
          godkjent_av: string | null
          godkjent_dato: string | null
          id: string
          kommentar: string | null
          til_aar: number
          timer: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fra_aar: number
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          kommentar?: string | null
          til_aar: number
          timer: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          fra_aar?: number
          godkjent_av?: string | null
          godkjent_dato?: string | null
          id?: string
          kommentar?: string | null
          til_aar?: number
          timer?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferie_overforing_godkjent_av_fkey"
            columns: ["godkjent_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferie_overforing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fravaer: {
        Row: {
          created_at: string | null
          dokumentasjon_url: string | null
          fravaerstype: Database["public"]["Enums"]["fravaerstype"]
          id: string
          kommentar: string | null
          prosent: number | null
          registrert_av: string | null
          salon_id: string
          sluttdato: string
          startdato: string
          status: string | null
          timer: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dokumentasjon_url?: string | null
          fravaerstype: Database["public"]["Enums"]["fravaerstype"]
          id?: string
          kommentar?: string | null
          prosent?: number | null
          registrert_av?: string | null
          salon_id: string
          sluttdato: string
          startdato: string
          status?: string | null
          timer?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dokumentasjon_url?: string | null
          fravaerstype?: Database["public"]["Enums"]["fravaerstype"]
          id?: string
          kommentar?: string | null
          prosent?: number | null
          registrert_av?: string | null
          salon_id?: string
          sluttdato?: string
          startdato?: string
          status?: string | null
          timer?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fravaer_registrert_av_fkey"
            columns: ["registrert_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fravaer_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fravaer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_imports: {
        Row: {
          error_message: string | null
          file_name: string
          id: string
          imported_at: string | null
          imported_by_user_id: string | null
          rows_imported: number | null
          salon_id: string | null
          status: string | null
        }
        Insert: {
          error_message?: string | null
          file_name: string
          id?: string
          imported_at?: string | null
          imported_by_user_id?: string | null
          rows_imported?: number | null
          salon_id?: string | null
          status?: string | null
        }
        Update: {
          error_message?: string | null
          file_name?: string
          id?: string
          imported_at?: string | null
          imported_by_user_id?: string | null
          rows_imported?: number | null
          salon_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_imports_imported_by_user_id_fkey"
            columns: ["imported_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_imports_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      historiske_tall: {
        Row: {
          aar: number
          behandling_kr: number | null
          created_at: string | null
          dag: number | null
          dato: string | null
          id: string
          kilde: string | null
          kunder: number | null
          maned: number | null
          salon_id: string
          timer_jobbet: number | null
          total_kr: number | null
          uke: number | null
          user_id: string | null
          vare_kr: number | null
        }
        Insert: {
          aar: number
          behandling_kr?: number | null
          created_at?: string | null
          dag?: number | null
          dato?: string | null
          id?: string
          kilde?: string | null
          kunder?: number | null
          maned?: number | null
          salon_id: string
          timer_jobbet?: number | null
          total_kr?: number | null
          uke?: number | null
          user_id?: string | null
          vare_kr?: number | null
        }
        Update: {
          aar?: number
          behandling_kr?: number | null
          created_at?: string | null
          dag?: number | null
          dato?: string | null
          id?: string
          kilde?: string | null
          kunder?: number | null
          maned?: number | null
          salon_id?: string
          timer_jobbet?: number | null
          total_kr?: number | null
          uke?: number | null
          user_id?: string | null
          vare_kr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historiske_tall_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historiske_tall_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hubspot_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hubspot_owner_district_mapping: {
        Row: {
          created_at: string | null
          district_id: string | null
          hubspot_owner_email: string | null
          hubspot_owner_id: string
          hubspot_owner_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          district_id?: string | null
          hubspot_owner_email?: string | null
          hubspot_owner_id: string
          hubspot_owner_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          district_id?: string | null
          hubspot_owner_email?: string | null
          hubspot_owner_id?: string
          hubspot_owner_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hubspot_owner_district_mapping_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_coverage_details: {
        Row: {
          coverage_type: string
          coverage_value: string
          created_at: string | null
          id: string
          sort_order: number | null
          tier_id: string
        }
        Insert: {
          coverage_type: string
          coverage_value: string
          created_at?: string | null
          id?: string
          sort_order?: number | null
          tier_id: string
        }
        Update: {
          coverage_type?: string
          coverage_value?: string
          created_at?: string | null
          id?: string
          sort_order?: number | null
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_coverage_details_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "insurance_product_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_order_employees: {
        Row: {
          created_at: string | null
          id: string
          order_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_order_employees_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "insurance_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_order_employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number | null
          tier_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity?: number | null
          tier_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number | null
          tier_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "insurance_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "insurance_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_order_items_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "insurance_product_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_orders: {
        Row: {
          aarlig_omsetning: number | null
          admin_notes: string | null
          antall_ansatte: number | null
          antall_arsverk: number | null
          approved_at: string | null
          approved_by_user_id: string | null
          completed_at: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          desired_start_date: string | null
          frende_reference: string | null
          frende_transfer_date: string | null
          id: string
          invoiced_at: string | null
          order_category: string | null
          order_type: Database["public"]["Enums"]["insurance_order_type"]
          ordered_by_user_id: string
          poa_signature_at: string | null
          poa_signature_name: string | null
          previous_insurances: Json | null
          rejection_reason: string | null
          salon_address: string | null
          salon_city: string | null
          salon_id: string
          salon_postal_code: string | null
          sent_to_frende_at: string | null
          source_quote_id: string | null
          status: Database["public"]["Enums"]["insurance_order_status"]
          switching_provider: boolean | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          aarlig_omsetning?: number | null
          admin_notes?: string | null
          antall_ansatte?: number | null
          antall_arsverk?: number | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          desired_start_date?: string | null
          frende_reference?: string | null
          frende_transfer_date?: string | null
          id?: string
          invoiced_at?: string | null
          order_category?: string | null
          order_type?: Database["public"]["Enums"]["insurance_order_type"]
          ordered_by_user_id: string
          poa_signature_at?: string | null
          poa_signature_name?: string | null
          previous_insurances?: Json | null
          rejection_reason?: string | null
          salon_address?: string | null
          salon_city?: string | null
          salon_id: string
          salon_postal_code?: string | null
          sent_to_frende_at?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["insurance_order_status"]
          switching_provider?: boolean | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          aarlig_omsetning?: number | null
          admin_notes?: string | null
          antall_ansatte?: number | null
          antall_arsverk?: number | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          completed_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          desired_start_date?: string | null
          frende_reference?: string | null
          frende_transfer_date?: string | null
          id?: string
          invoiced_at?: string | null
          order_category?: string | null
          order_type?: Database["public"]["Enums"]["insurance_order_type"]
          ordered_by_user_id?: string
          poa_signature_at?: string | null
          poa_signature_name?: string | null
          previous_insurances?: Json | null
          rejection_reason?: string | null
          salon_address?: string | null
          salon_city?: string | null
          salon_id?: string
          salon_postal_code?: string | null
          sent_to_frende_at?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["insurance_order_status"]
          switching_provider?: boolean | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_orders_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_orders_ordered_by_user_id_fkey"
            columns: ["ordered_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_orders_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_orders_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "insurance_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_power_of_attorney: {
        Row: {
          admin_notified_at: string | null
          consent_privacy: boolean | null
          consent_transfer: boolean | null
          contact_name: string
          created_at: string | null
          email: string
          has_existing_insurance: boolean | null
          id: string
          ip_address: string | null
          org_number: string
          otp_attempts: number | null
          otp_code_hash: string
          otp_expires_at: string
          pdf_url: string | null
          phone: string | null
          previous_insurers: Json | null
          quote_id: string | null
          salon_id: string | null
          salon_name: string
          signed: boolean | null
          signed_at: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          admin_notified_at?: string | null
          consent_privacy?: boolean | null
          consent_transfer?: boolean | null
          contact_name: string
          created_at?: string | null
          email: string
          has_existing_insurance?: boolean | null
          id?: string
          ip_address?: string | null
          org_number: string
          otp_attempts?: number | null
          otp_code_hash: string
          otp_expires_at: string
          pdf_url?: string | null
          phone?: string | null
          previous_insurers?: Json | null
          quote_id?: string | null
          salon_id?: string | null
          salon_name: string
          signed?: boolean | null
          signed_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          admin_notified_at?: string | null
          consent_privacy?: boolean | null
          consent_transfer?: boolean | null
          contact_name?: string
          created_at?: string | null
          email?: string
          has_existing_insurance?: boolean | null
          id?: string
          ip_address?: string | null
          org_number?: string
          otp_attempts?: number | null
          otp_code_hash?: string
          otp_expires_at?: string
          pdf_url?: string | null
          phone?: string | null
          previous_insurers?: Json | null
          quote_id?: string | null
          salon_id?: string | null
          salon_name?: string
          signed?: boolean | null
          signed_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_power_of_attorney_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "insurance_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_power_of_attorney_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_product_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_url: string
          id: string
          product_id: string
          tier_id: string | null
          title: string
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string
          file_url: string
          id?: string
          product_id: string
          tier_id?: string | null
          title: string
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_url?: string
          id?: string
          product_id?: string
          tier_id?: string | null
          title?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_product_documents_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "insurance_product_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_product_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_product_tiers: {
        Row: {
          created_at: string | null
          id: string
          price: number
          product_id: string
          sort_order: number | null
          tier_description: string | null
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          price: number
          product_id: string
          sort_order?: number | null
          tier_description?: string | null
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          price?: number
          product_id?: string
          sort_order?: number | null
          tier_description?: string | null
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_product_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "insurance_products"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_products: {
        Row: {
          active: boolean | null
          base_price: number
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          name: string
          price_model: Database["public"]["Enums"]["insurance_price_model"]
          product_type: Database["public"]["Enums"]["insurance_product_type"]
          requires_employee_selection: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_price: number
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
          price_model: Database["public"]["Enums"]["insurance_price_model"]
          product_type: Database["public"]["Enums"]["insurance_product_type"]
          requires_employee_selection?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          base_price?: number
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          price_model?: Database["public"]["Enums"]["insurance_price_model"]
          product_type?: Database["public"]["Enums"]["insurance_product_type"]
          requires_employee_selection?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      insurance_quotes: {
        Row: {
          aarlig_omsetning: number | null
          acceptance_ip: string | null
          acceptance_token: string | null
          acceptance_user_agent: string | null
          accepted_at: string | null
          antall_ansatte: number | null
          antall_arsverk: number | null
          completed_at: string | null
          contact_name: string
          created_at: string
          district_manager_id: string
          email: string
          expires_at: string | null
          id: string
          link_to_fullmakt: string | null
          member_salon_id: string | null
          notes: string | null
          org_number: string
          phone: string | null
          products: Json
          salon_address: string | null
          salon_city: string | null
          salon_name: string
          salon_postal_code: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["insurance_quote_status"]
          total_price: number
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          aarlig_omsetning?: number | null
          acceptance_ip?: string | null
          acceptance_token?: string | null
          acceptance_user_agent?: string | null
          accepted_at?: string | null
          antall_ansatte?: number | null
          antall_arsverk?: number | null
          completed_at?: string | null
          contact_name: string
          created_at?: string
          district_manager_id: string
          email: string
          expires_at?: string | null
          id?: string
          link_to_fullmakt?: string | null
          member_salon_id?: string | null
          notes?: string | null
          org_number: string
          phone?: string | null
          products?: Json
          salon_address?: string | null
          salon_city?: string | null
          salon_name: string
          salon_postal_code?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["insurance_quote_status"]
          total_price?: number
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          aarlig_omsetning?: number | null
          acceptance_ip?: string | null
          acceptance_token?: string | null
          acceptance_user_agent?: string | null
          accepted_at?: string | null
          antall_ansatte?: number | null
          antall_arsverk?: number | null
          completed_at?: string | null
          contact_name?: string
          created_at?: string
          district_manager_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          link_to_fullmakt?: string | null
          member_salon_id?: string | null
          notes?: string | null
          org_number?: string
          phone?: string | null
          products?: Json
          salon_address?: string | null
          salon_city?: string | null
          salon_name?: string
          salon_postal_code?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["insurance_quote_status"]
          total_price?: number
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_quotes_district_manager_id_fkey"
            columns: ["district_manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_quotes_link_to_fullmakt_fkey"
            columns: ["link_to_fullmakt"]
            isOneToOne: false
            referencedRelation: "insurance_power_of_attorney"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_quotes_member_salon_id_fkey"
            columns: ["member_salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_scheduled_cancellations: {
        Row: {
          cancellation_date: string
          created_at: string | null
          hubspot_synced: boolean | null
          hubspot_synced_at: string | null
          id: string
          insurance_type: string
          processed: boolean | null
          processed_at: string | null
          reason: string | null
          salon_id: string
          scheduled_at: string | null
          scheduled_by: string | null
          updated_at: string | null
        }
        Insert: {
          cancellation_date: string
          created_at?: string | null
          hubspot_synced?: boolean | null
          hubspot_synced_at?: string | null
          id?: string
          insurance_type: string
          processed?: boolean | null
          processed_at?: string | null
          reason?: string | null
          salon_id: string
          scheduled_at?: string | null
          scheduled_by?: string | null
          updated_at?: string | null
        }
        Update: {
          cancellation_date?: string
          created_at?: string | null
          hubspot_synced?: boolean | null
          hubspot_synced_at?: string | null
          id?: string
          insurance_type?: string
          processed?: boolean | null
          processed_at?: string | null
          reason?: string | null
          salon_id?: string
          scheduled_at?: string | null
          scheduled_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_scheduled_cancellations_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_scheduled_cancellations_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          created_at: string | null
          created_by_user_id: string | null
          district_id: string | null
          email: string
          expires_at: string | null
          hubspot_contact_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string | null
          supplier_id: string | null
          token: string
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          district_id?: string | null
          email: string
          expires_at?: string | null
          hubspot_contact_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id?: string | null
          supplier_id?: string | null
          token: string
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          district_id?: string | null
          email?: string
          expires_at?: string | null
          hubspot_contact_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string | null
          supplier_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      kalender: {
        Row: {
          aar: number
          created_at: string | null
          dato: string
          er_arbeidsdag: boolean | null
          er_helligdag: boolean | null
          er_juleferie: boolean | null
          er_sommerferie: boolean | null
          helligdag_navn: string | null
          id: string
          maned: number
          uke: number
          ukedag: number
        }
        Insert: {
          aar: number
          created_at?: string | null
          dato: string
          er_arbeidsdag?: boolean | null
          er_helligdag?: boolean | null
          er_juleferie?: boolean | null
          er_sommerferie?: boolean | null
          helligdag_navn?: string | null
          id?: string
          maned: number
          uke: number
          ukedag: number
        }
        Update: {
          aar?: number
          created_at?: string | null
          dato?: string
          er_arbeidsdag?: boolean | null
          er_helligdag?: boolean | null
          er_juleferie?: boolean | null
          er_sommerferie?: boolean | null
          helligdag_navn?: string | null
          id?: string
          maned?: number
          uke?: number
          ukedag?: number
        }
        Relationships: []
      }
      lonn_historikk: {
        Row: {
          arsak: string | null
          created_at: string | null
          endret_av: string | null
          fastlonn: number | null
          gyldig_fra: string
          gyldig_til: string | null
          id: string
          timesats: number | null
          user_id: string
        }
        Insert: {
          arsak?: string | null
          created_at?: string | null
          endret_av?: string | null
          fastlonn?: number | null
          gyldig_fra: string
          gyldig_til?: string | null
          id?: string
          timesats?: number | null
          user_id: string
        }
        Update: {
          arsak?: string | null
          created_at?: string | null
          endret_av?: string | null
          fastlonn?: number | null
          gyldig_fra?: string
          gyldig_til?: string | null
          id?: string
          timesats?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lonn_historikk_endret_av_fkey"
            columns: ["endret_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lonn_historikk_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_states: {
        Row: {
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_states_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          district_id: string | null
          id: string
          salon_id: string | null
          subject: string
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          district_id?: string | null
          id?: string
          salon_id?: string | null
          subject: string
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          district_id?: string | null
          id?: string
          salon_id?: string | null
          subject?: string
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string | null
          id: string
          message_text: string
          sender_user_id: string | null
          thread_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          message_text: string
          sender_user_id?: string | null
          thread_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          message_text?: string
          sender_user_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_challenges: {
        Row: {
          created_at: string | null
          description: string | null
          goal_description: string | null
          id: string
          kpi_focus: string
          month: number
          period_type: string
          target_value: number | null
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          goal_description?: string | null
          id?: string
          kpi_focus: string
          month: number
          period_type?: string
          target_value?: number | null
          title: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          goal_description?: string | null
          id?: string
          kpi_focus?: string
          month?: number
          period_type?: string
          target_value?: number | null
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      rapport_kommentarer: {
        Row: {
          aar: number
          created_at: string | null
          id: string
          kommentar: string | null
          kpi_type: string | null
          maned: number | null
          opprettet_av: string | null
          periode_type: string
          salon_id: string
          svar: string | null
          uke: number | null
          updated_at: string | null
        }
        Insert: {
          aar: number
          created_at?: string | null
          id?: string
          kommentar?: string | null
          kpi_type?: string | null
          maned?: number | null
          opprettet_av?: string | null
          periode_type?: string
          salon_id: string
          svar?: string | null
          uke?: number | null
          updated_at?: string | null
        }
        Update: {
          aar?: number
          created_at?: string | null
          id?: string
          kommentar?: string | null
          kpi_type?: string | null
          maned?: number | null
          opprettet_av?: string | null
          periode_type?: string
          salon_id?: string
          svar?: string | null
          uke?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rapport_kommentarer_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapport_kommentarer_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          changed_at: string
          changed_by_name: string
          changed_by_user_id: string
          id: string
          new_role: string
          old_role: string
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          changed_at?: string
          changed_by_name: string
          changed_by_user_id: string
          id?: string
          new_role: string
          old_role: string
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          changed_at?: string
          changed_by_name?: string
          changed_by_user_id?: string
          id?: string
          new_role?: string
          old_role?: string
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      salon_goals: {
        Row: {
          created_at: string | null
          id: string
          salon_id: string | null
          target_addon_share_percent: number | null
          target_efficiency_percent: number | null
          target_rebooking_percent: number | null
          target_revenue_per_customer: number | null
          target_revenue_per_hour: number | null
          target_total_revenue: number | null
          target_varesalg_percent: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          salon_id?: string | null
          target_addon_share_percent?: number | null
          target_efficiency_percent?: number | null
          target_rebooking_percent?: number | null
          target_revenue_per_customer?: number | null
          target_revenue_per_hour?: number | null
          target_total_revenue?: number | null
          target_varesalg_percent?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          salon_id?: string | null
          target_addon_share_percent?: number | null
          target_efficiency_percent?: number | null
          target_rebooking_percent?: number | null
          target_revenue_per_customer?: number | null
          target_revenue_per_hour?: number | null
          target_total_revenue?: number | null
          target_varesalg_percent?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salon_goals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_insurance: {
        Row: {
          aktivering_dato: string | null
          antall_ansatte: number | null
          antall_arsverk: number | null
          antall_fritidsulykke: number | null
          antall_reiseforsikring: number | null
          arlig_omsetning: number | null
          avsluttede_forsikringer: boolean | null
          bestillingsdato: string | null
          bytter_selskap: boolean | null
          created_at: string | null
          cyber_aktiv: boolean | null
          fritidsulykke_aktiv: boolean | null
          helse_antall_aktive: number | null
          helse_status: boolean | null
          helseforsikring_avtalenummer: string | null
          helseforsikring_oppsigelsesdato: string | null
          helseforsikring_oppstartsdato: string | null
          helseforsikring_premie: number | null
          helseforsikring_status: string | null
          hubspot_company_id: string | null
          hubspot_synced_at: string | null
          id: string
          innmelding_dato: string | null
          kontaktperson_epost: string | null
          kontaktperson_navn: string | null
          oppsigelse_dato: string | null
          oppstartsdato: string | null
          pris_cyber: number | null
          pris_fritidsulykke: number | null
          pris_reise: number | null
          pris_salong: number | null
          pris_yrkesskadeforsikring: number | null
          reise_aktiv: boolean | null
          salon_id: string
          salong_aktiv: boolean | null
          salong_niva: string | null
          sum_fritidsulykke: number | null
          sum_mvil: string | null
          sum_reise: number | null
          sum_totalt: number | null
          sum_yrkesskadeforsikring: number | null
          tidligere_forsikringer: string | null
          updated_at: string | null
          yrkesskadeforsikring_aktiv: boolean | null
        }
        Insert: {
          aktivering_dato?: string | null
          antall_ansatte?: number | null
          antall_arsverk?: number | null
          antall_fritidsulykke?: number | null
          antall_reiseforsikring?: number | null
          arlig_omsetning?: number | null
          avsluttede_forsikringer?: boolean | null
          bestillingsdato?: string | null
          bytter_selskap?: boolean | null
          created_at?: string | null
          cyber_aktiv?: boolean | null
          fritidsulykke_aktiv?: boolean | null
          helse_antall_aktive?: number | null
          helse_status?: boolean | null
          helseforsikring_avtalenummer?: string | null
          helseforsikring_oppsigelsesdato?: string | null
          helseforsikring_oppstartsdato?: string | null
          helseforsikring_premie?: number | null
          helseforsikring_status?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          innmelding_dato?: string | null
          kontaktperson_epost?: string | null
          kontaktperson_navn?: string | null
          oppsigelse_dato?: string | null
          oppstartsdato?: string | null
          pris_cyber?: number | null
          pris_fritidsulykke?: number | null
          pris_reise?: number | null
          pris_salong?: number | null
          pris_yrkesskadeforsikring?: number | null
          reise_aktiv?: boolean | null
          salon_id: string
          salong_aktiv?: boolean | null
          salong_niva?: string | null
          sum_fritidsulykke?: number | null
          sum_mvil?: string | null
          sum_reise?: number | null
          sum_totalt?: number | null
          sum_yrkesskadeforsikring?: number | null
          tidligere_forsikringer?: string | null
          updated_at?: string | null
          yrkesskadeforsikring_aktiv?: boolean | null
        }
        Update: {
          aktivering_dato?: string | null
          antall_ansatte?: number | null
          antall_arsverk?: number | null
          antall_fritidsulykke?: number | null
          antall_reiseforsikring?: number | null
          arlig_omsetning?: number | null
          avsluttede_forsikringer?: boolean | null
          bestillingsdato?: string | null
          bytter_selskap?: boolean | null
          created_at?: string | null
          cyber_aktiv?: boolean | null
          fritidsulykke_aktiv?: boolean | null
          helse_antall_aktive?: number | null
          helse_status?: boolean | null
          helseforsikring_avtalenummer?: string | null
          helseforsikring_oppsigelsesdato?: string | null
          helseforsikring_oppstartsdato?: string | null
          helseforsikring_premie?: number | null
          helseforsikring_status?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          innmelding_dato?: string | null
          kontaktperson_epost?: string | null
          kontaktperson_navn?: string | null
          oppsigelse_dato?: string | null
          oppstartsdato?: string | null
          pris_cyber?: number | null
          pris_fritidsulykke?: number | null
          pris_reise?: number | null
          pris_salong?: number | null
          pris_yrkesskadeforsikring?: number | null
          reise_aktiv?: boolean | null
          salon_id?: string
          salong_aktiv?: boolean | null
          salong_niva?: string | null
          sum_fritidsulykke?: number | null
          sum_mvil?: string | null
          sum_reise?: number | null
          sum_totalt?: number | null
          sum_yrkesskadeforsikring?: number | null
          tidligere_forsikringer?: string | null
          updated_at?: string | null
          yrkesskadeforsikring_aktiv?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_insurance_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_suppliers: {
        Row: {
          created_at: string | null
          id: string
          salon_id: string | null
          supplier_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          salon_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          salon_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_suppliers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      salong_apningstider: {
        Row: {
          apner: string | null
          created_at: string | null
          id: string
          salon_id: string
          stenger: string | null
          stengt: boolean | null
          ukedag: number
          updated_at: string | null
        }
        Insert: {
          apner?: string | null
          created_at?: string | null
          id?: string
          salon_id: string
          stenger?: string | null
          stengt?: boolean | null
          ukedag: number
          updated_at?: string | null
        }
        Update: {
          apner?: string | null
          created_at?: string | null
          id?: string
          salon_id?: string
          stenger?: string | null
          stengt?: boolean | null
          ukedag?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salong_apningstider_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salong_apningstider_unntak: {
        Row: {
          apner: string | null
          arsak: string | null
          created_at: string | null
          dato: string
          id: string
          salon_id: string
          stenger: string | null
          stengt: boolean | null
        }
        Insert: {
          apner?: string | null
          arsak?: string | null
          created_at?: string | null
          dato: string
          id?: string
          salon_id: string
          stenger?: string | null
          stengt?: boolean | null
        }
        Update: {
          apner?: string | null
          arsak?: string | null
          created_at?: string | null
          dato?: string
          id?: string
          salon_id?: string
          stenger?: string | null
          stengt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "salong_apningstider_unntak_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          chain_id: string | null
          city: string | null
          created_at: string | null
          district_id: string | null
          employee_count: number | null
          founded_date: string | null
          hubspot_company_id: string | null
          hubspot_synced_at: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          medlemsstatus: string | null
          name: string
          org_number: string | null
          owner_id: string | null
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          chain_id?: string | null
          city?: string | null
          created_at?: string | null
          district_id?: string | null
          employee_count?: number | null
          founded_date?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          medlemsstatus?: string | null
          name: string
          org_number?: string | null
          owner_id?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          chain_id?: string | null
          city?: string | null
          created_at?: string | null
          district_id?: string | null
          employee_count?: number | null
          founded_date?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          medlemsstatus?: string | null
          name?: string
          org_number?: string | null
          owner_id?: string | null
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salons_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salons_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salons_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_kpi_config: {
        Row: {
          budsjett_stillingsprosent_kilde:
            | Database["public"]["Enums"]["budsjett_stillingsprosent_kilde"]
            | null
          created_at: string | null
          effektivitet_prosent_mal: number | null
          id: string
          omsetning_per_time_mal: number | null
          rebooking_prosent_mal: number | null
          salon_id: string
          updated_at: string | null
          user_id: string
          varesalg_prosent_mal: number | null
        }
        Insert: {
          budsjett_stillingsprosent_kilde?:
            | Database["public"]["Enums"]["budsjett_stillingsprosent_kilde"]
            | null
          created_at?: string | null
          effektivitet_prosent_mal?: number | null
          id?: string
          omsetning_per_time_mal?: number | null
          rebooking_prosent_mal?: number | null
          salon_id: string
          updated_at?: string | null
          user_id: string
          varesalg_prosent_mal?: number | null
        }
        Update: {
          budsjett_stillingsprosent_kilde?:
            | Database["public"]["Enums"]["budsjett_stillingsprosent_kilde"]
            | null
          created_at?: string | null
          effektivitet_prosent_mal?: number | null
          id?: string
          omsetning_per_time_mal?: number | null
          rebooking_prosent_mal?: number | null
          salon_id?: string
          updated_at?: string | null
          user_id?: string
          varesalg_prosent_mal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stylist_kpi_config_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stylist_kpi_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_team_users: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          supplier_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          supplier_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          supplier_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_team_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_team_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          hubspot_company_id: string | null
          hubspot_synced_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          hubspot_company_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_implementeringer: {
        Row: {
          created_at: string | null
          id: string
          implementert_av: string | null
          implementert_dato: string
          mal_id: string
          salon_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          implementert_av?: string | null
          implementert_dato?: string
          mal_id: string
          salon_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          implementert_av?: string | null
          implementert_dato?: string
          mal_id?: string
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariff_implementeringer_implementert_av_fkey"
            columns: ["implementert_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_implementeringer_mal_id_fkey"
            columns: ["mal_id"]
            isOneToOne: false
            referencedRelation: "tariff_maler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_implementeringer_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_maler: {
        Row: {
          aar: number
          ansiennitet_max: number | null
          ansiennitet_min: number
          beskrivelse: string | null
          created_at: string | null
          fagbrev_status: Database["public"]["Enums"]["fagbrev_status"]
          gyldig_fra: string
          gyldig_til: string | null
          id: string
          maanedslonn: number | null
          navn: string
          opprettet_av: string | null
          timesats: number
          updated_at: string | null
        }
        Insert: {
          aar: number
          ansiennitet_max?: number | null
          ansiennitet_min?: number
          beskrivelse?: string | null
          created_at?: string | null
          fagbrev_status: Database["public"]["Enums"]["fagbrev_status"]
          gyldig_fra?: string
          gyldig_til?: string | null
          id?: string
          maanedslonn?: number | null
          navn?: string
          opprettet_av?: string | null
          timesats: number
          updated_at?: string | null
        }
        Update: {
          aar?: number
          ansiennitet_max?: number | null
          ansiennitet_min?: number
          beskrivelse?: string | null
          created_at?: string | null
          fagbrev_status?: Database["public"]["Enums"]["fagbrev_status"]
          gyldig_fra?: string
          gyldig_til?: string | null
          id?: string
          maanedslonn?: number | null
          navn?: string
          opprettet_av?: string | null
          timesats?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariff_maler_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_satser: {
        Row: {
          aar: number
          ansiennitet_max: number | null
          ansiennitet_min: number
          avvik_fra_mal: number | null
          beskrivelse: string | null
          created_at: string | null
          fagbrev_status: Database["public"]["Enums"]["fagbrev_status"]
          gyldig_fra: string
          id: string
          kilde_mal_id: string | null
          maanedslonn: number | null
          opprettet_av: string | null
          salon_id: string
          timesats: number
          updated_at: string | null
        }
        Insert: {
          aar: number
          ansiennitet_max?: number | null
          ansiennitet_min?: number
          avvik_fra_mal?: number | null
          beskrivelse?: string | null
          created_at?: string | null
          fagbrev_status: Database["public"]["Enums"]["fagbrev_status"]
          gyldig_fra?: string
          id?: string
          kilde_mal_id?: string | null
          maanedslonn?: number | null
          opprettet_av?: string | null
          salon_id: string
          timesats: number
          updated_at?: string | null
        }
        Update: {
          aar?: number
          ansiennitet_max?: number | null
          ansiennitet_min?: number
          avvik_fra_mal?: number | null
          beskrivelse?: string | null
          created_at?: string | null
          fagbrev_status?: Database["public"]["Enums"]["fagbrev_status"]
          gyldig_fra?: string
          id?: string
          kilde_mal_id?: string | null
          maanedslonn?: number | null
          opprettet_av?: string | null
          salon_id?: string
          timesats?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariff_satser_kilde_mal_id_fkey"
            columns: ["kilde_mal_id"]
            isOneToOne: false
            referencedRelation: "tariff_maler"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_satser_opprettet_av_fkey"
            columns: ["opprettet_av"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_satser_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_participants: {
        Row: {
          added_at: string | null
          archived_at: string | null
          id: string
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          archived_at?: string | null
          id?: string
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          archived_at?: string | null
          id?: string
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      turnus_preferanser: {
        Row: {
          created_at: string | null
          gyldig_fra: string | null
          id: string
          kan_ikke_jobbe: boolean | null
          kommentar: string | null
          onsket_slutt_tid: string | null
          onsket_start_tid: string | null
          prioritet: number | null
          salon_id: string
          ukedag: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gyldig_fra?: string | null
          id?: string
          kan_ikke_jobbe?: boolean | null
          kommentar?: string | null
          onsket_slutt_tid?: string | null
          onsket_start_tid?: string | null
          prioritet?: number | null
          salon_id: string
          ukedag?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gyldig_fra?: string | null
          id?: string
          kan_ikke_jobbe?: boolean | null
          kommentar?: string | null
          onsket_slutt_tid?: string | null
          onsket_start_tid?: string | null
          prioritet?: number | null
          salon_id?: string
          ukedag?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnus_preferanser_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnus_preferanser_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      turnus_skift: {
        Row: {
          created_at: string | null
          dato: string
          id: string
          kilde: Database["public"]["Enums"]["skift_kilde"] | null
          notat: string | null
          salon_id: string
          slutt_tid: string | null
          start_tid: string | null
          timer_planlagt: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dato: string
          id?: string
          kilde?: Database["public"]["Enums"]["skift_kilde"] | null
          notat?: string | null
          salon_id: string
          slutt_tid?: string | null
          start_tid?: string | null
          timer_planlagt?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dato?: string
          id?: string
          kilde?: Database["public"]["Enums"]["skift_kilde"] | null
          notat?: string | null
          salon_id?: string
          slutt_tid?: string | null
          start_tid?: string | null
          timer_planlagt?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnus_skift_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnus_skift_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chain_roles: {
        Row: {
          chain_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          chain_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          chain_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chain_roles_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_chain_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_on_new_message: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_on_new_message?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_on_new_message?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_salon_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_salon_roles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_salon_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          aktiv: boolean | null
          ansettelsesdato: string | null
          avatar_url: string | null
          created_at: string | null
          district_id: string | null
          email: string
          fagbrev: boolean | null
          fagbrevdato: string | null
          fastlonn: number | null
          first_name: string | null
          fodselsdato: string | null
          frisorfunksjon: Database["public"]["Enums"]["frisorfunksjon"] | null
          helseforsikring_avtalenummer: string | null
          helseforsikring_oppsigelsesdato: string | null
          helseforsikring_oppstartsdato: string | null
          helseforsikring_personnummer: string | null
          helseforsikring_pris: number | null
          helseforsikring_status: string | null
          hubspot_contact_id: string | null
          hubspot_synced_at: string | null
          id: string
          last_name: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string | null
          stillingsprosent: number | null
          timesats: number | null
          updated_at: string | null
        }
        Insert: {
          aktiv?: boolean | null
          ansettelsesdato?: string | null
          avatar_url?: string | null
          created_at?: string | null
          district_id?: string | null
          email: string
          fagbrev?: boolean | null
          fagbrevdato?: string | null
          fastlonn?: number | null
          first_name?: string | null
          fodselsdato?: string | null
          frisorfunksjon?: Database["public"]["Enums"]["frisorfunksjon"] | null
          helseforsikring_avtalenummer?: string | null
          helseforsikring_oppsigelsesdato?: string | null
          helseforsikring_oppstartsdato?: string | null
          helseforsikring_personnummer?: string | null
          helseforsikring_pris?: number | null
          helseforsikring_status?: string | null
          hubspot_contact_id?: string | null
          hubspot_synced_at?: string | null
          id: string
          last_name?: string | null
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          salon_id?: string | null
          stillingsprosent?: number | null
          timesats?: number | null
          updated_at?: string | null
        }
        Update: {
          aktiv?: boolean | null
          ansettelsesdato?: string | null
          avatar_url?: string | null
          created_at?: string | null
          district_id?: string | null
          email?: string
          fagbrev?: boolean | null
          fagbrevdato?: string | null
          fastlonn?: number | null
          first_name?: string | null
          fodselsdato?: string | null
          frisorfunksjon?: Database["public"]["Enums"]["frisorfunksjon"] | null
          helseforsikring_avtalenummer?: string | null
          helseforsikring_oppsigelsesdato?: string | null
          helseforsikring_oppstartsdato?: string | null
          helseforsikring_personnummer?: string | null
          helseforsikring_pris?: number | null
          helseforsikring_status?: string | null
          hubspot_contact_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          last_name?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string | null
          stillingsprosent?: number | null
          timesats?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_salon"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_kpi_inputs: {
        Row: {
          addon_count: number
          created_at: string | null
          hours_with_client: number
          hours_worked: number
          id: string
          rebooked_visits: number
          retail_revenue: number
          salon_id: string | null
          stylist_id: string | null
          submitted_at: string | null
          submitted_by_user_id: string | null
          treatment_revenue: number
          updated_at: string | null
          visit_count: number
          visits_with_addon: number
          week: number
          year: number
        }
        Insert: {
          addon_count?: number
          created_at?: string | null
          hours_with_client?: number
          hours_worked?: number
          id?: string
          rebooked_visits?: number
          retail_revenue?: number
          salon_id?: string | null
          stylist_id?: string | null
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          treatment_revenue?: number
          updated_at?: string | null
          visit_count?: number
          visits_with_addon?: number
          week: number
          year: number
        }
        Update: {
          addon_count?: number
          created_at?: string | null
          hours_with_client?: number
          hours_worked?: number
          id?: string
          rebooked_visits?: number
          retail_revenue?: number
          salon_id?: string | null
          stylist_id?: string | null
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          treatment_revenue?: number
          updated_at?: string | null
          visit_count?: number
          visits_with_addon?: number
          week?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_kpi_inputs_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_kpi_inputs_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_kpi_inputs_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_kpis: {
        Row: {
          addon_share_percent: number
          created_at: string | null
          efficiency_percent: number
          id: string
          rebooking_percent: number
          revenue_per_customer: number
          revenue_per_hour: number
          salon_id: string | null
          stylist_id: string | null
          total_revenue: number
          updated_at: string | null
          week: number
          year: number
        }
        Insert: {
          addon_share_percent?: number
          created_at?: string | null
          efficiency_percent?: number
          id?: string
          rebooking_percent?: number
          revenue_per_customer?: number
          revenue_per_hour?: number
          salon_id?: string | null
          stylist_id?: string | null
          total_revenue?: number
          updated_at?: string | null
          week: number
          year: number
        }
        Update: {
          addon_share_percent?: number
          created_at?: string | null
          efficiency_percent?: number
          id?: string
          rebooking_percent?: number
          revenue_per_customer?: number
          revenue_per_hour?: number
          salon_id?: string | null
          stylist_id?: string | null
          total_revenue?: number
          updated_at?: string | null
          week?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_kpis_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_kpis_stylist_id_fkey"
            columns: ["stylist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      beregn_daglig_budsjett: {
        Args: {
          p_dato: string
          p_effektivitet: number
          p_omsetning_per_time: number
          p_user_id: string
          p_varesalg_prosent: number
        }
        Returns: {
          behandling: number
          kundetimer: number
          total: number
          vare: number
        }[]
      }
      beregn_ferietimer: {
        Args: { p_sluttdato: string; p_startdato: string; p_user_id: string }
        Returns: number
      }
      beregn_maanedslonn: {
        Args: { p_stillingsprosent?: number; p_timesats: number }
        Returns: number
      }
      er_salong_apen: {
        Args: { p_dato: string; p_salon_id: string }
        Returns: boolean
      }
      get_aktiv_budsjett_versjon: {
        Args: { p_aar: number; p_salon_id: string }
        Returns: string
      }
      get_alder: { Args: { p_user_id: string }; Returns: number }
      get_ansiennitet_aar: { Args: { p_user_id: string }; Returns: number }
      get_arbeidsdager_i_periode: {
        Args: { p_fra: string; p_til: string }
        Returns: number
      }
      get_arbeidsdager_i_uke: {
        Args: { p_aar: number; p_uke: number }
        Returns: number
      }
      get_district_salon_ids: { Args: { _user_id: string }; Returns: string[] }
      get_helseforsikring_personnummer: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          accepted: boolean
          created_at: string
          district_id: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          supplier_id: string
          token: string
        }[]
      }
      get_salon_supplier_user_ids: {
        Args: { _salon_id: string }
        Returns: string[]
      }
      get_supplier_salon_ids: { Args: { _user_id: string }; Returns: string[] }
      get_thread_participant_user_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_turnus_timer_for_dag: {
        Args: { p_dato: string; p_user_id: string }
        Returns: number
      }
      get_user_accessible_salon_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_district_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role_from_users: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_salon_id: { Args: { _user_id: string }; Returns: string }
      get_user_supplier_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_salon_access: {
        Args: { _salon_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { p_user_id: string }; Returns: boolean }
      is_chain_owner: {
        Args: { _chain_id: string; _user_id: string }
        Returns: boolean
      }
      is_salon_owner: { Args: { _user_id: string }; Returns: boolean }
      is_supplier_admin: {
        Args: { _supplier_id: string; _user_id: string }
        Returns: boolean
      }
      is_thread_participant: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      valider_egenmelding: {
        Args: { p_sluttdato: string; p_startdato: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "district_manager"
        | "salon_owner"
        | "stylist"
        | "apprentice"
        | "supplier_admin"
        | "supplier_sales"
        | "supplier_business_dev"
        | "daglig_leder"
        | "avdelingsleder"
        | "styreleder"
        | "chain_owner"
        | "seniorfrisor"
      budsjett_arsak_null:
        | "helg"
        | "helligdag"
        | "ferie"
        | "salong_stengt"
        | "turnus_fridag"
        | "permisjon"
        | "annet"
      budsjett_stillingsprosent_kilde: "ansatt" | "turnus"
      fagbrev_status: "uten_fagbrev" | "med_fagbrev" | "mester"
      ferie_status: "planlagt" | "godkjent" | "avslatt" | "avviklet"
      fravaerstype:
        | "egenmelding"
        | "sykmelding"
        | "lege_helse"
        | "velferdspermisjon"
        | "foreldrepermisjon"
        | "ulonnet_permisjon"
        | "annet"
      frisorfunksjon: "frisor" | "senior_frisor" | "laerling"
      insurance_order_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent_to_frende"
        | "completed"
        | "cancelled"
        | "invoiced"
        | "registered"
      insurance_order_type: "new" | "change" | "cancellation"
      insurance_price_model: "fast" | "per_arsverk" | "per_person"
      insurance_product_type:
        | "salong"
        | "yrkesskade"
        | "cyber"
        | "reise"
        | "fritidsulykke"
        | "helse"
      insurance_quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "expired"
        | "completed"
        | "withdrawn"
      skift_kilde: "turnus" | "manuell" | "bytte"
      turnus_uke_type: "alle" | "partall" | "oddetall"
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
      app_role: [
        "admin",
        "district_manager",
        "salon_owner",
        "stylist",
        "apprentice",
        "supplier_admin",
        "supplier_sales",
        "supplier_business_dev",
        "daglig_leder",
        "avdelingsleder",
        "styreleder",
        "chain_owner",
        "seniorfrisor",
      ],
      budsjett_arsak_null: [
        "helg",
        "helligdag",
        "ferie",
        "salong_stengt",
        "turnus_fridag",
        "permisjon",
        "annet",
      ],
      budsjett_stillingsprosent_kilde: ["ansatt", "turnus"],
      fagbrev_status: ["uten_fagbrev", "med_fagbrev", "mester"],
      ferie_status: ["planlagt", "godkjent", "avslatt", "avviklet"],
      fravaerstype: [
        "egenmelding",
        "sykmelding",
        "lege_helse",
        "velferdspermisjon",
        "foreldrepermisjon",
        "ulonnet_permisjon",
        "annet",
      ],
      frisorfunksjon: ["frisor", "senior_frisor", "laerling"],
      insurance_order_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "sent_to_frende",
        "completed",
        "cancelled",
        "invoiced",
        "registered",
      ],
      insurance_order_type: ["new", "change", "cancellation"],
      insurance_price_model: ["fast", "per_arsverk", "per_person"],
      insurance_product_type: [
        "salong",
        "yrkesskade",
        "cyber",
        "reise",
        "fritidsulykke",
        "helse",
      ],
      insurance_quote_status: [
        "draft",
        "sent",
        "accepted",
        "expired",
        "completed",
        "withdrawn",
      ],
      skift_kilde: ["turnus", "manuell", "bytte"],
      turnus_uke_type: ["alle", "partall", "oddetall"],
    },
  },
} as const
