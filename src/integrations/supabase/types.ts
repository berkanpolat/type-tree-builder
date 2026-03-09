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
      firmalar: {
        Row: {
          aylik_tedarik_birim_id: string | null
          aylik_tedarik_sayisi: number | null
          aylik_uretim_kapasitesi: number | null
          bagimsiz_denetim_id: string | null
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
          tiktok: string | null
          updated_at: string
          uretim_satis_rolu: string | null
          uretim_vardiyasi_id: string | null
          user_id: string
          vergi_dairesi: string
          vergi_numarasi: string
          web_sitesi: string | null
          x_twitter: string | null
        }
        Insert: {
          aylik_tedarik_birim_id?: string | null
          aylik_tedarik_sayisi?: number | null
          aylik_uretim_kapasitesi?: number | null
          bagimsiz_denetim_id?: string | null
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
          tiktok?: string | null
          updated_at?: string
          uretim_satis_rolu?: string | null
          uretim_vardiyasi_id?: string | null
          user_id: string
          vergi_dairesi: string
          vergi_numarasi: string
          web_sitesi?: string | null
          x_twitter?: string | null
        }
        Update: {
          aylik_tedarik_birim_id?: string | null
          aylik_tedarik_sayisi?: number | null
          aylik_uretim_kapasitesi?: number | null
          bagimsiz_denetim_id?: string | null
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
          tiktok?: string | null
          updated_at?: string
          uretim_satis_rolu?: string | null
          uretim_vardiyasi_id?: string | null
          user_id?: string
          vergi_dairesi?: string
          vergi_numarasi?: string
          web_sitesi?: string | null
          x_twitter?: string | null
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
          id: string
          ihale_id: string
          teklif_veren_user_id: string
          tutar: number
        }
        Insert: {
          created_at?: string
          durum?: string
          id?: string
          ihale_id: string
          teklif_veren_user_id: string
          tutar: number
        }
        Update: {
          created_at?: string
          durum?: string
          id?: string
          ihale_id?: string
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
          baslangic_fiyati: number | null
          baslangic_tarihi: string | null
          baslik: string
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
          baslangic_fiyati?: number | null
          baslangic_tarihi?: string | null
          baslik: string
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
          baslangic_fiyati?: number | null
          baslangic_tarihi?: string | null
          baslik?: string
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
      profiles: {
        Row: {
          ad: string
          created_at: string
          id: string
          iletisim_email: string
          iletisim_numarasi: string | null
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
          soyad?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
