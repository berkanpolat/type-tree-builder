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
      admin_activity_log: {
        Row: {
          action: string
          admin_ad: string
          admin_id: string
          admin_pozisyon: string
          admin_soyad: string
          admin_username: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_ad: string
          admin_id: string
          admin_pozisyon: string
          admin_soyad: string
          admin_username: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_ad?: string
          admin_id?: string
          admin_pozisyon?: string
          admin_soyad?: string
          admin_username?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_aksiyonlar: {
        Row: {
          aciklama: string | null
          admin_id: string
          baslik: string
          created_at: string
          durum: string
          firma_id: string
          id: string
          tarih: string
          tur: string
          updated_at: string
        }
        Insert: {
          aciklama?: string | null
          admin_id: string
          baslik: string
          created_at?: string
          durum?: string
          firma_id: string
          id?: string
          tarih?: string
          tur?: string
          updated_at?: string
        }
        Update: {
          aciklama?: string | null
          admin_id?: string
          baslik?: string
          created_at?: string
          durum?: string
          firma_id?: string
          id?: string
          tarih?: string
          tur?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_aksiyonlar_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_aksiyonlar_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_portfolyo: {
        Row: {
          admin_id: string
          created_at: string
          firma_id: string
          id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          firma_id: string
          id?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          firma_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_portfolyo_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_portfolyo_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: true
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          ad: string
          created_at: string
          created_by: string | null
          departman: string
          email: string | null
          id: string
          is_primary: boolean
          password_hash: string
          permissions: Json
          pozisyon: string
          soyad: string
          telefon: string | null
          updated_at: string
          username: string
        }
        Insert: {
          ad: string
          created_at?: string
          created_by?: string | null
          departman?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          password_hash: string
          permissions?: Json
          pozisyon?: string
          soyad: string
          telefon?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          ad?: string
          created_at?: string
          created_by?: string | null
          departman?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          password_hash?: string
          permissions?: Json
          pozisyon?: string
          soyad?: string
          telefon?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          aktif: boolean
          baslik: string
          boyut: string
          created_at: string
          gorsel_url: string | null
          id: string
          konum: string
          link_url: string | null
          sayfa: string
          slug: string
          updated_at: string
        }
        Insert: {
          aktif?: boolean
          baslik: string
          boyut: string
          created_at?: string
          gorsel_url?: string | null
          id?: string
          konum: string
          link_url?: string | null
          sayfa: string
          slug: string
          updated_at?: string
        }
        Update: {
          aktif?: boolean
          baslik?: string
          boyut?: string
          created_at?: string
          gorsel_url?: string | null
          id?: string
          konum?: string
          link_url?: string | null
          sayfa?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_bilgi: {
        Row: {
          aktif: boolean
          cevap: string
          created_at: string
          id: string
          kategori: string
          sira: number
          soru: string
          updated_at: string
        }
        Insert: {
          aktif?: boolean
          cevap: string
          created_at?: string
          id?: string
          kategori?: string
          sira?: number
          soru: string
          updated_at?: string
        }
        Update: {
          aktif?: boolean
          cevap?: string
          created_at?: string
          id?: string
          kategori?: string
          sira?: number
          soru?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_config: {
        Row: {
          aciklama: string | null
          anahtar: string
          deger: string
          id: string
          updated_at: string
        }
        Insert: {
          aciklama?: string | null
          anahtar: string
          deger: string
          id?: string
          updated_at?: string
        }
        Update: {
          aciklama?: string | null
          anahtar?: string
          deger?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      destek_mesajlar: {
        Row: {
          content: string
          created_at: string
          destek_id: string
          ek_dosya_adi: string | null
          ek_dosya_url: string | null
          id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string
          destek_id: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          sender_id: string
          sender_type?: string
        }
        Update: {
          content?: string
          created_at?: string
          destek_id?: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "destek_mesajlar_destek_id_fkey"
            columns: ["destek_id"]
            isOneToOne: false
            referencedRelation: "destek_talepleri"
            referencedColumns: ["id"]
          },
        ]
      }
      destek_talepleri: {
        Row: {
          aciklama: string
          created_at: string
          departman: string
          durum: string
          ek_dosya_adi: string | null
          ek_dosya_url: string | null
          id: string
          konu: string
          talep_no: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aciklama: string
          created_at?: string
          departman: string
          durum?: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          konu: string
          talep_no?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aciklama?: string
          created_at?: string
          departman?: string
          durum?: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          konu?: string
          talep_no?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      firma_belgeler: {
        Row: {
          belge_turu: string
          created_at: string
          dosya_adi: string
          dosya_url: string
          durum: string
          firma_id: string
          id: string
          karar_sebebi: string | null
          karar_tarihi: string | null
          karar_veren: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          belge_turu: string
          created_at?: string
          dosya_adi: string
          dosya_url: string
          durum?: string
          firma_id: string
          id?: string
          karar_sebebi?: string | null
          karar_tarihi?: string | null
          karar_veren?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          belge_turu?: string
          created_at?: string
          dosya_adi?: string
          dosya_url?: string
          durum?: string
          firma_id?: string
          id?: string
          karar_sebebi?: string | null
          karar_tarihi?: string | null
          karar_veren?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_belgeler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_bilgi_kategorileri: {
        Row: {
          created_at: string
          format: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          format?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      firma_bilgi_secenekleri: {
        Row: {
          created_at: string
          id: string
          kategori_id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kategori_id: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kategori_id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firma_bilgi_secenekleri_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_kategorileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_bilgi_secenekleri_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_favoriler: {
        Row: {
          created_at: string
          firma_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firma_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firma_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_favoriler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_galeri: {
        Row: {
          created_at: string
          firma_id: string
          foto_adi: string | null
          foto_url: string
          id: string
        }
        Insert: {
          created_at?: string
          firma_id: string
          foto_adi?: string | null
          foto_url: string
          id?: string
        }
        Update: {
          created_at?: string
          firma_id?: string
          foto_adi?: string | null
          foto_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_galeri_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_kisitlamalar: {
        Row: {
          aktif: boolean
          bitis_tarihi: string
          created_at: string
          created_by: string
          id: string
          kisitlama_alanlari: Json
          sebep: string
          sikayet_id: string | null
          user_id: string
        }
        Insert: {
          aktif?: boolean
          bitis_tarihi: string
          created_at?: string
          created_by: string
          id?: string
          kisitlama_alanlari?: Json
          sebep: string
          sikayet_id?: string | null
          user_id: string
        }
        Update: {
          aktif?: boolean
          bitis_tarihi?: string
          created_at?: string
          created_by?: string
          id?: string
          kisitlama_alanlari?: Json
          sebep?: string
          sikayet_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_kisitlamalar_sikayet_id_fkey"
            columns: ["sikayet_id"]
            isOneToOne: false
            referencedRelation: "sikayetler"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_makineler: {
        Row: {
          created_at: string
          firma_id: string
          id: string
          makine_kategori_id: string
          makine_sayisi: string | null
          makine_tur_id: string
          tesis_id: string | null
        }
        Insert: {
          created_at?: string
          firma_id: string
          id?: string
          makine_kategori_id: string
          makine_sayisi?: string | null
          makine_tur_id: string
          tesis_id?: string | null
        }
        Update: {
          created_at?: string
          firma_id?: string
          id?: string
          makine_kategori_id?: string
          makine_sayisi?: string | null
          makine_tur_id?: string
          tesis_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firma_makineler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_makineler_makine_kategori_id_fkey"
            columns: ["makine_kategori_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_makineler_makine_tur_id_fkey"
            columns: ["makine_tur_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_makineler_tesis_id_fkey"
            columns: ["tesis_id"]
            isOneToOne: false
            referencedRelation: "firma_tesisler"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_referanslar: {
        Row: {
          created_at: string
          firma_id: string
          id: string
          logo_url: string | null
          referans_adi: string
        }
        Insert: {
          created_at?: string
          firma_id: string
          id?: string
          logo_url?: string | null
          referans_adi: string
        }
        Update: {
          created_at?: string
          firma_id?: string
          id?: string
          logo_url?: string | null
          referans_adi?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_referanslar_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_sertifikalar: {
        Row: {
          created_at: string
          firma_id: string
          gecerlilik_tarihi: string | null
          id: string
          sertifika_kategori_id: string
          sertifika_tur_id: string
          verilis_tarihi: string | null
        }
        Insert: {
          created_at?: string
          firma_id: string
          gecerlilik_tarihi?: string | null
          id?: string
          sertifika_kategori_id: string
          sertifika_tur_id: string
          verilis_tarihi?: string | null
        }
        Update: {
          created_at?: string
          firma_id?: string
          gecerlilik_tarihi?: string | null
          id?: string
          sertifika_kategori_id?: string
          sertifika_tur_id?: string
          verilis_tarihi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firma_sertifikalar_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_sertifikalar_sertifika_kategori_id_fkey"
            columns: ["sertifika_kategori_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_sertifikalar_sertifika_tur_id_fkey"
            columns: ["sertifika_tur_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_teknolojiler: {
        Row: {
          created_at: string
          firma_id: string
          id: string
          teknoloji_kategori_id: string
          teknoloji_tur_id: string
        }
        Insert: {
          created_at?: string
          firma_id: string
          id?: string
          teknoloji_kategori_id: string
          teknoloji_tur_id: string
        }
        Update: {
          created_at?: string
          firma_id?: string
          id?: string
          teknoloji_kategori_id?: string
          teknoloji_tur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_teknolojiler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_teknolojiler_teknoloji_kategori_id_fkey"
            columns: ["teknoloji_kategori_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_teknolojiler_teknoloji_tur_id_fkey"
            columns: ["teknoloji_tur_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_tesisler: {
        Row: {
          created_at: string
          firma_id: string
          id: string
          il_id: string | null
          ilce_id: string | null
          is_gucu_id: string | null
          makine_gucu: string | null
          tesis_adi_id: string
          tesis_adresi: string | null
        }
        Insert: {
          created_at?: string
          firma_id: string
          id?: string
          il_id?: string | null
          ilce_id?: string | null
          is_gucu_id?: string | null
          makine_gucu?: string | null
          tesis_adi_id: string
          tesis_adresi?: string | null
        }
        Update: {
          created_at?: string
          firma_id?: string
          id?: string
          il_id?: string | null
          ilce_id?: string | null
          is_gucu_id?: string | null
          makine_gucu?: string | null
          tesis_adi_id?: string
          tesis_adresi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firma_tesisler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_tesisler_il_id_fkey"
            columns: ["il_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_tesisler_ilce_id_fkey"
            columns: ["ilce_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_tesisler_is_gucu_id_fkey"
            columns: ["is_gucu_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_tesisler_tesis_adi_id_fkey"
            columns: ["tesis_adi_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_tipleri: {
        Row: {
          created_at: string
          firma_turu_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          firma_turu_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          firma_turu_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_tipleri_firma_turu_id_fkey"
            columns: ["firma_turu_id"]
            isOneToOne: false
            referencedRelation: "firma_turleri"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_turleri: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      firma_uretim_satis: {
        Row: {
          created_at: string
          firma_id: string
          grup_id: string
          id: string
          kategori_id: string
          tip: string
          tur_id: string
        }
        Insert: {
          created_at?: string
          firma_id: string
          grup_id: string
          id?: string
          kategori_id: string
          tip: string
          tur_id: string
        }
        Update: {
          created_at?: string
          firma_id?: string
          grup_id?: string
          id?: string
          kategori_id?: string
          tip?: string
          tur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_uretim_satis_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_uretim_satis_grup_id_fkey"
            columns: ["grup_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_uretim_satis_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_uretim_satis_tur_id_fkey"
            columns: ["tur_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_urun_hizmet_secimler: {
        Row: {
          created_at: string
          firma_id: string
          id: string
          kategori_id: string
          secenek_id: string
        }
        Insert: {
          created_at?: string
          firma_id: string
          id?: string
          kategori_id: string
          secenek_id: string
        }
        Update: {
          created_at?: string
          firma_id?: string
          id?: string
          kategori_id?: string
          secenek_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_urun_hizmet_secimler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_urun_hizmet_secimler_kategori_id_fkey"
            columns: ["kategori_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_kategorileri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firma_urun_hizmet_secimler_secenek_id_fkey"
            columns: ["secenek_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_uzaklastirmalar: {
        Row: {
          aktif: boolean
          bitis_tarihi: string
          created_at: string
          created_by: string
          id: string
          sebep: string | null
          sikayet_id: string | null
          user_id: string
        }
        Insert: {
          aktif?: boolean
          bitis_tarihi: string
          created_at?: string
          created_by: string
          id?: string
          sebep?: string | null
          sikayet_id?: string | null
          user_id: string
        }
        Update: {
          aktif?: boolean
          bitis_tarihi?: string
          created_at?: string
          created_by?: string
          id?: string
          sebep?: string | null
          sikayet_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firma_uzaklastirmalar_sikayet_id_fkey"
            columns: ["sikayet_id"]
            isOneToOne: false
            referencedRelation: "sikayetler"
            referencedColumns: ["id"]
          },
        ]
      }
      firma_yasaklar: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          firma_unvani: string | null
          id: string
          sebep: string | null
          sikayet_id: string | null
          user_id: string
          vergi_numarasi: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          firma_unvani?: string | null
          id?: string
          sebep?: string | null
          sikayet_id?: string | null
          user_id: string
          vergi_numarasi?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          firma_unvani?: string | null
          id?: string
          sebep?: string | null
          sikayet_id?: string | null
          user_id?: string
          vergi_numarasi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firma_yasaklar_sikayet_id_fkey"
            columns: ["sikayet_id"]
            isOneToOne: false
            referencedRelation: "sikayetler"
            referencedColumns: ["id"]
          },
        ]
      }
      firmalar: {
        Row: {
          aylik_tedarik_birim_id: string | null
          aylik_tedarik_sayisi: number | null
          aylik_uretim_kapasitesi: number | null
          bagimsiz_denetim_id: string | null
          belge_onayli: boolean
          created_at: string
          facebook: string | null
          firma_hakkinda: string | null
          firma_iletisim_email: string | null
          firma_iletisim_numarasi: string | null
          firma_olcegi_id: string | null
          firma_tipi_id: string
          firma_turu_id: string
          firma_unvani: string
          fiziksel_magaza_sayisi: number | null
          hizli_numune_id: string | null
          id: string
          instagram: string | null
          kapak_fotografi_url: string | null
          kurulus_il_id: string | null
          kurulus_ilce_id: string | null
          kurulus_tarihi: string | null
          linkedin: string | null
          logo_url: string | null
          moq: number | null
          onay_durumu: string
          slug: string | null
          tiktok: string | null
          updated_at: string
          uretim_satis_rolu: string | null
          uretim_vardiyasi_id: string | null
          user_id: string
          vergi_dairesi: string | null
          vergi_numarasi: string | null
          web_sitesi: string | null
          x_twitter: string | null
          youtube: string | null
        }
        Insert: {
          aylik_tedarik_birim_id?: string | null
          aylik_tedarik_sayisi?: number | null
          aylik_uretim_kapasitesi?: number | null
          bagimsiz_denetim_id?: string | null
          belge_onayli?: boolean
          created_at?: string
          facebook?: string | null
          firma_hakkinda?: string | null
          firma_iletisim_email?: string | null
          firma_iletisim_numarasi?: string | null
          firma_olcegi_id?: string | null
          firma_tipi_id: string
          firma_turu_id: string
          firma_unvani: string
          fiziksel_magaza_sayisi?: number | null
          hizli_numune_id?: string | null
          id?: string
          instagram?: string | null
          kapak_fotografi_url?: string | null
          kurulus_il_id?: string | null
          kurulus_ilce_id?: string | null
          kurulus_tarihi?: string | null
          linkedin?: string | null
          logo_url?: string | null
          moq?: number | null
          onay_durumu?: string
          slug?: string | null
          tiktok?: string | null
          updated_at?: string
          uretim_satis_rolu?: string | null
          uretim_vardiyasi_id?: string | null
          user_id: string
          vergi_dairesi?: string | null
          vergi_numarasi?: string | null
          web_sitesi?: string | null
          x_twitter?: string | null
          youtube?: string | null
        }
        Update: {
          aylik_tedarik_birim_id?: string | null
          aylik_tedarik_sayisi?: number | null
          aylik_uretim_kapasitesi?: number | null
          bagimsiz_denetim_id?: string | null
          belge_onayli?: boolean
          created_at?: string
          facebook?: string | null
          firma_hakkinda?: string | null
          firma_iletisim_email?: string | null
          firma_iletisim_numarasi?: string | null
          firma_olcegi_id?: string | null
          firma_tipi_id?: string
          firma_turu_id?: string
          firma_unvani?: string
          fiziksel_magaza_sayisi?: number | null
          hizli_numune_id?: string | null
          id?: string
          instagram?: string | null
          kapak_fotografi_url?: string | null
          kurulus_il_id?: string | null
          kurulus_ilce_id?: string | null
          kurulus_tarihi?: string | null
          linkedin?: string | null
          logo_url?: string | null
          moq?: number | null
          onay_durumu?: string
          slug?: string | null
          tiktok?: string | null
          updated_at?: string
          uretim_satis_rolu?: string | null
          uretim_vardiyasi_id?: string | null
          user_id?: string
          vergi_dairesi?: string | null
          vergi_numarasi?: string | null
          web_sitesi?: string | null
          x_twitter?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firmalar_aylik_tedarik_birim_id_fkey"
            columns: ["aylik_tedarik_birim_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_bagimsiz_denetim_id_fkey"
            columns: ["bagimsiz_denetim_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_firma_olcegi_id_fkey"
            columns: ["firma_olcegi_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_firma_tipi_id_fkey"
            columns: ["firma_tipi_id"]
            isOneToOne: false
            referencedRelation: "firma_tipleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_firma_turu_id_fkey"
            columns: ["firma_turu_id"]
            isOneToOne: false
            referencedRelation: "firma_turleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_hizli_numune_id_fkey"
            columns: ["hizli_numune_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmalar_uretim_vardiyasi_id_fkey"
            columns: ["uretim_vardiyasi_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
      ihale_ek_dosyalar: {
        Row: {
          created_at: string
          dosya_adi: string
          dosya_url: string
          id: string
          ihale_id: string
          sira: number
        }
        Insert: {
          created_at?: string
          dosya_adi: string
          dosya_url: string
          id?: string
          ihale_id: string
          sira?: number
        }
        Update: {
          created_at?: string
          dosya_adi?: string
          dosya_url?: string
          id?: string
          ihale_id?: string
          sira?: number
        }
        Relationships: [
          {
            foreignKeyName: "ihale_ek_dosyalar_ihale_id_fkey"
            columns: ["ihale_id"]
            isOneToOne: false
            referencedRelation: "ihaleler"
            referencedColumns: ["id"]
          },
        ]
      }
      ihale_filtreler: {
        Row: {
          created_at: string
          filtre_tipi: string
          id: string
          ihale_id: string
          secenek_id: string
        }
        Insert: {
          created_at?: string
          filtre_tipi: string
          id?: string
          ihale_id: string
          secenek_id: string
        }
        Update: {
          created_at?: string
          filtre_tipi?: string
          id?: string
          ihale_id?: string
          secenek_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ihale_filtreler_ihale_id_fkey"
            columns: ["ihale_id"]
            isOneToOne: false
            referencedRelation: "ihaleler"
            referencedColumns: ["id"]
          },
        ]
      }
      ihale_fotograflar: {
        Row: {
          created_at: string
          foto_url: string
          id: string
          ihale_id: string
          sira: number
        }
        Insert: {
          created_at?: string
          foto_url: string
          id?: string
          ihale_id: string
          sira?: number
        }
        Update: {
          created_at?: string
          foto_url?: string
          id?: string
          ihale_id?: string
          sira?: number
        }
        Relationships: [
          {
            foreignKeyName: "ihale_fotograflar_ihale_id_fkey"
            columns: ["ihale_id"]
            isOneToOne: false
            referencedRelation: "ihaleler"
            referencedColumns: ["id"]
          },
        ]
      }
      ihale_stok: {
        Row: {
          created_at: string
          id: string
          ihale_id: string
          miktar_tipi: string
          stok_sayisi: number
          varyant_1_label: string
          varyant_1_value: string
          varyant_2_label: string | null
          varyant_2_value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ihale_id: string
          miktar_tipi?: string
          stok_sayisi?: number
          varyant_1_label: string
          varyant_1_value: string
          varyant_2_label?: string | null
          varyant_2_value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ihale_id?: string
          miktar_tipi?: string
          stok_sayisi?: number
          varyant_1_label?: string
          varyant_1_value?: string
          varyant_2_label?: string | null
          varyant_2_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ihale_stok_ihale_id_fkey"
            columns: ["ihale_id"]
            isOneToOne: false
            referencedRelation: "ihaleler"
            referencedColumns: ["id"]
          },
        ]
      }
      ihale_teklifler: {
        Row: {
          created_at: string
          durum: string
          ek_dosya_adi: string | null
          ek_dosya_url: string | null
          id: string
          ihale_id: string
          kargo_masrafi: string | null
          odeme_secenekleri: string | null
          odeme_vadesi: string | null
          teklif_veren_user_id: string
          tutar: number
        }
        Insert: {
          created_at?: string
          durum?: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          ihale_id: string
          kargo_masrafi?: string | null
          odeme_secenekleri?: string | null
          odeme_vadesi?: string | null
          teklif_veren_user_id: string
          tutar: number
        }
        Update: {
          created_at?: string
          durum?: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          ihale_id?: string
          kargo_masrafi?: string | null
          odeme_secenekleri?: string | null
          odeme_vadesi?: string | null
          teklif_veren_user_id?: string
          tutar?: number
        }
        Relationships: [
          {
            foreignKeyName: "ihale_teklifler_ihale_id_fkey"
            columns: ["ihale_id"]
            isOneToOne: false
            referencedRelation: "ihaleler"
            referencedColumns: ["id"]
          },
        ]
      }
      ihaleler: {
        Row: {
          aciklama: string | null
          admin_karar_sebebi: string | null
          admin_karar_tarihi: string | null
          admin_karar_veren: string | null
          baslangic_fiyati: number | null
          baslangic_tarihi: string | null
          baslik: string
          birim: string | null
          bitis_tarihi: string | null
          created_at: string
          durum: string
          ek_dosya_url: string | null
          firma_adi_gizle: boolean | null
          foto_url: string | null
          goruntuleme_sayisi: number
          hizmet_kategori_id: string | null
          hizmet_tur_id: string | null
          id: string
          ihale_no: string
          ihale_turu: string
          kargo_masrafi: string | null
          kargo_sirketi_anlasmasi: string | null
          kdv_durumu: string | null
          min_teklif_degisim: number | null
          odeme_secenekleri: string | null
          odeme_vadesi: string | null
          ozel_filtreleme: boolean | null
          para_birimi: string | null
          slug: string | null
          teklif_usulu: string
          teknik_detaylar: Json | null
          teslimat_tarihi: string | null
          teslimat_yeri: string | null
          updated_at: string
          urun_grup_id: string | null
          urun_kategori_id: string | null
          urun_tur_id: string | null
          user_id: string
        }
        Insert: {
          aciklama?: string | null
          admin_karar_sebebi?: string | null
          admin_karar_tarihi?: string | null
          admin_karar_veren?: string | null
          baslangic_fiyati?: number | null
          baslangic_tarihi?: string | null
          baslik: string
          birim?: string | null
          bitis_tarihi?: string | null
          created_at?: string
          durum?: string
          ek_dosya_url?: string | null
          firma_adi_gizle?: boolean | null
          foto_url?: string | null
          goruntuleme_sayisi?: number
          hizmet_kategori_id?: string | null
          hizmet_tur_id?: string | null
          id?: string
          ihale_no: string
          ihale_turu?: string
          kargo_masrafi?: string | null
          kargo_sirketi_anlasmasi?: string | null
          kdv_durumu?: string | null
          min_teklif_degisim?: number | null
          odeme_secenekleri?: string | null
          odeme_vadesi?: string | null
          ozel_filtreleme?: boolean | null
          para_birimi?: string | null
          slug?: string | null
          teklif_usulu?: string
          teknik_detaylar?: Json | null
          teslimat_tarihi?: string | null
          teslimat_yeri?: string | null
          updated_at?: string
          urun_grup_id?: string | null
          urun_kategori_id?: string | null
          urun_tur_id?: string | null
          user_id: string
        }
        Update: {
          aciklama?: string | null
          admin_karar_sebebi?: string | null
          admin_karar_tarihi?: string | null
          admin_karar_veren?: string | null
          baslangic_fiyati?: number | null
          baslangic_tarihi?: string | null
          baslik?: string
          birim?: string | null
          bitis_tarihi?: string | null
          created_at?: string
          durum?: string
          ek_dosya_url?: string | null
          firma_adi_gizle?: boolean | null
          foto_url?: string | null
          goruntuleme_sayisi?: number
          hizmet_kategori_id?: string | null
          hizmet_tur_id?: string | null
          id?: string
          ihale_no?: string
          ihale_turu?: string
          kargo_masrafi?: string | null
          kargo_sirketi_anlasmasi?: string | null
          kdv_durumu?: string | null
          min_teklif_degisim?: number | null
          odeme_secenekleri?: string | null
          odeme_vadesi?: string | null
          ozel_filtreleme?: boolean | null
          para_birimi?: string | null
          slug?: string | null
          teklif_usulu?: string
          teknik_detaylar?: Json | null
          teslimat_tarihi?: string | null
          teslimat_yeri?: string | null
          updated_at?: string
          urun_grup_id?: string | null
          urun_kategori_id?: string | null
          urun_tur_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kullanici_abonelikler: {
        Row: {
          created_at: string
          donem_baslangic: string
          donem_bitis: string
          durum: string
          ekstra_haklar: Json
          id: string
          paket_id: string
          periyot: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          donem_baslangic?: string
          donem_bitis?: string
          durum?: string
          ekstra_haklar?: Json
          id?: string
          paket_id: string
          periyot?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          donem_baslangic?: string
          donem_bitis?: string
          durum?: string
          ekstra_haklar?: Json
          id?: string
          paket_id?: string
          periyot?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kullanici_abonelikler_paket_id_fkey"
            columns: ["paket_id"]
            isOneToOne: false
            referencedRelation: "paketler"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
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
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      odeme_kayitlari: {
        Row: {
          created_at: string
          durum: string
          id: string
          merchant_oid: string
          periyot: string
          tutar_kurus: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          durum?: string
          id?: string
          merchant_oid: string
          periyot?: string
          tutar_kurus?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          durum?: string
          id?: string
          merchant_oid?: string
          periyot?: string
          tutar_kurus?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      paketler: {
        Row: {
          ad: string
          aktif: boolean
          aktif_urun_limiti: number
          created_at: string
          fiyat_aylik: number | null
          fiyat_yillik: number | null
          id: string
          ihale_acma_limiti: number | null
          mesaj_limiti: number | null
          para_birimi: string
          profil_goruntuleme_limiti: number | null
          slug: string
          stripe_price_aylik_id: string | null
          stripe_price_yillik_id: string | null
          teklif_verme_limiti: number | null
        }
        Insert: {
          ad: string
          aktif?: boolean
          aktif_urun_limiti?: number
          created_at?: string
          fiyat_aylik?: number | null
          fiyat_yillik?: number | null
          id?: string
          ihale_acma_limiti?: number | null
          mesaj_limiti?: number | null
          para_birimi?: string
          profil_goruntuleme_limiti?: number | null
          slug: string
          stripe_price_aylik_id?: string | null
          stripe_price_yillik_id?: string | null
          teklif_verme_limiti?: number | null
        }
        Update: {
          ad?: string
          aktif?: boolean
          aktif_urun_limiti?: number
          created_at?: string
          fiyat_aylik?: number | null
          fiyat_yillik?: number | null
          id?: string
          ihale_acma_limiti?: number | null
          mesaj_limiti?: number | null
          para_birimi?: string
          profil_goruntuleme_limiti?: number | null
          slug?: string
          stripe_price_aylik_id?: string | null
          stripe_price_yillik_id?: string | null
          teklif_verme_limiti?: number | null
        }
        Relationships: []
      }
      profil_goruntulemeler: {
        Row: {
          created_at: string
          firma_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firma_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firma_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profil_goruntulemeler_firma_id_fkey"
            columns: ["firma_id"]
            isOneToOne: false
            referencedRelation: "firmalar"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ad: string
          created_at: string
          id: string
          iletisim_email: string
          iletisim_numarasi: string | null
          last_seen: string | null
          soyad: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ad: string
          created_at?: string
          id?: string
          iletisim_email: string
          iletisim_numarasi?: string | null
          last_seen?: string | null
          soyad: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ad?: string
          created_at?: string
          id?: string
          iletisim_email?: string
          iletisim_numarasi?: string | null
          last_seen?: string | null
          soyad?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sikayetler: {
        Row: {
          aciklama: string | null
          bildiren_user_id: string
          created_at: string
          durum: string
          ek_dosya_adi: string | null
          ek_dosya_url: string | null
          id: string
          islem_detay: string | null
          islem_tarihi: string | null
          islem_tipi: string | null
          islem_yapan: string | null
          referans_id: string
          sebep: string
          sikayet_no: string
          tur: string
        }
        Insert: {
          aciklama?: string | null
          bildiren_user_id: string
          created_at?: string
          durum?: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          islem_detay?: string | null
          islem_tarihi?: string | null
          islem_tipi?: string | null
          islem_yapan?: string | null
          referans_id: string
          sebep: string
          sikayet_no?: string
          tur: string
        }
        Update: {
          aciklama?: string | null
          bildiren_user_id?: string
          created_at?: string
          durum?: string
          ek_dosya_adi?: string | null
          ek_dosya_url?: string | null
          id?: string
          islem_detay?: string | null
          islem_tarihi?: string | null
          islem_tipi?: string | null
          islem_yapan?: string | null
          referans_id?: string
          sebep?: string
          sikayet_no?: string
          tur?: string
        }
        Relationships: []
      }
      sms_otp_codes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          kod: string
          telefon: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          kod: string
          telefon: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          kod?: string
          telefon?: string
          verified?: boolean
        }
        Relationships: []
      }
      urun_favoriler: {
        Row: {
          created_at: string
          id: string
          urun_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          urun_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          urun_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "urun_favoriler_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      urun_varyasyonlar: {
        Row: {
          birim_fiyat: number
          created_at: string
          foto_url: string
          id: string
          max_adet: number
          min_adet: number
          urun_id: string
          varyant_1_label: string
          varyant_1_value: string
          varyant_2_label: string | null
          varyant_2_value: string | null
        }
        Insert: {
          birim_fiyat?: number
          created_at?: string
          foto_url: string
          id?: string
          max_adet?: number
          min_adet?: number
          urun_id: string
          varyant_1_label: string
          varyant_1_value: string
          varyant_2_label?: string | null
          varyant_2_value?: string | null
        }
        Update: {
          birim_fiyat?: number
          created_at?: string
          foto_url?: string
          id?: string
          max_adet?: number
          min_adet?: number
          urun_id?: string
          varyant_1_label?: string
          varyant_1_value?: string
          varyant_2_label?: string | null
          varyant_2_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "urun_varyasyonlar_urun_id_fkey"
            columns: ["urun_id"]
            isOneToOne: false
            referencedRelation: "urunler"
            referencedColumns: ["id"]
          },
        ]
      }
      urunler: {
        Row: {
          aciklama: string | null
          admin_karar_sebebi: string | null
          admin_karar_tarihi: string | null
          admin_karar_veren: string | null
          baslik: string
          created_at: string
          durum: string
          fiyat: number | null
          fiyat_tipi: string
          foto_url: string | null
          goruntuleme_sayisi: number
          id: string
          min_siparis_miktari: number | null
          para_birimi: string | null
          slug: string | null
          teknik_detaylar: Json | null
          updated_at: string
          urun_grup_id: string | null
          urun_kategori_id: string | null
          urun_no: string
          urun_tur_id: string | null
          user_id: string
        }
        Insert: {
          aciklama?: string | null
          admin_karar_sebebi?: string | null
          admin_karar_tarihi?: string | null
          admin_karar_veren?: string | null
          baslik: string
          created_at?: string
          durum?: string
          fiyat?: number | null
          fiyat_tipi?: string
          foto_url?: string | null
          goruntuleme_sayisi?: number
          id?: string
          min_siparis_miktari?: number | null
          para_birimi?: string | null
          slug?: string | null
          teknik_detaylar?: Json | null
          updated_at?: string
          urun_grup_id?: string | null
          urun_kategori_id?: string | null
          urun_no: string
          urun_tur_id?: string | null
          user_id: string
        }
        Update: {
          aciklama?: string | null
          admin_karar_sebebi?: string | null
          admin_karar_tarihi?: string | null
          admin_karar_veren?: string | null
          baslik?: string
          created_at?: string
          durum?: string
          fiyat?: number | null
          fiyat_tipi?: string
          foto_url?: string | null
          goruntuleme_sayisi?: number
          id?: string
          min_siparis_miktari?: number | null
          para_birimi?: string | null
          slug?: string | null
          teknik_detaylar?: Json | null
          updated_at?: string
          urun_grup_id?: string | null
          urun_kategori_id?: string | null
          urun_no?: string
          urun_tur_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "urunler_urun_grup_id_fkey"
            columns: ["urun_grup_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urunler_urun_kategori_id_fkey"
            columns: ["urun_kategori_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urunler_urun_tur_id_fkey"
            columns: ["urun_tur_id"]
            isOneToOne: false
            referencedRelation: "firma_bilgi_secenekleri"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_hash_password: { Args: { p_password: string }; Returns: string }
      admin_verify_password: {
        Args: { p_password: string; p_username: string }
        Returns: boolean
      }
      check_registration_duplicate: {
        Args: { p_email: string; p_exclude_user_id?: string; p_phone?: string }
        Returns: Json
      }
      generate_firma_slug: { Args: { p_unvani: string }; Returns: string }
      generate_slug: {
        Args: { p_existing_id?: string; p_table: string; p_text: string }
        Returns: string
      }
      get_firma_sort_scores: {
        Args: { p_firma_ids: string[] }
        Returns: {
          firma_id: string
          is_pro: boolean
          profile_score: number
        }[]
      }
      get_or_create_conversation: {
        Args: { p_user1: string; p_user2: string }
        Returns: string
      }
      get_sorted_firmalar: {
        Args: {
          p_firma_ids?: string[]
          p_firma_olcegi_ids?: string[]
          p_firma_tipi_ids?: string[]
          p_firma_turu_id?: string
          p_il_ids?: string[]
          p_moq?: number
          p_page?: number
          p_per_page?: number
          p_search?: string
        }
        Returns: {
          firma_id: string
          is_pro: boolean
          profile_score: number
          total_count: number
        }[]
      }
      get_user_bid_ihale_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_ihale_ids: { Args: { _user_id: string }; Returns: string[] }
      has_bid_on_ihale: {
        Args: { _ihale_id: string; _user_id: string }
        Returns: boolean
      }
      is_ihale_owner: {
        Args: { _ihale_id: string; _user_id: string }
        Returns: boolean
      }
      normalize_email: { Args: { p_email: string }; Returns: string }
      normalize_phone: { Args: { p_phone: string }; Returns: string }
      register_user: {
        Args: {
          p_ad: string
          p_firma_tipi_id: string
          p_firma_turu_id: string
          p_firma_unvani: string
          p_iletisim_email: string
          p_iletisim_numarasi: string
          p_soyad: string
          p_user_id: string
          p_vergi_dairesi: string
          p_vergi_numarasi: string
        }
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
    Enums: {},
  },
} as const
