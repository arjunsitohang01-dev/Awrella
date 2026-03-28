'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, SiteContentKey, SiteContentMap } from '@/lib/site-content'
import { toSpotifyEmbedUrl } from '@/lib/spotify'
import type { UserRole } from '@/lib/user-roles'
import {
  ArrowUpDown,
  Camera,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    FileText,
    GripVertical,
  LayoutDashboard,
  LogOut,
  MessageCircle,
    Music,
    Shield,
    Trash2,
    UploadCloud,
    UserCog,
    Users,
} from 'lucide-react'

type DashboardUser = {
  id: string
  email: string
  name: string | null
  role: UserRole
  isActive: boolean
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  avatarUrl?: string | null
  authProvider?: 'password' | 'google'
  createdAt?: string
}

type DashboardPhoto = {
  id: string
  imageUrl: string
  caption: string | null
  order: number
  featured: boolean
  userId: string
}

type DashboardComment = {
  id: string
  content: string
  noteColor: 'CREAM' | 'BLUE' | 'BLUSH' | 'SAGE'
  hidden: boolean
  userId: string
  userName: string
  createdAt: string
}

type DashboardMusic = {
  id: string
  title: string
  spotifyUrl: string
  type: 'track' | 'playlist'
  featured: boolean
  order: number
}

type AuditLog = {
  id: string
  action: string
  targetType: string
  targetId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  admin: {
    id: string
    name: string | null
    email: string
  } | null
}

type UploadDropzoneProps = {
  id: string
  label: string
  hint: string
  recommendedSize?: string
  file: File | null
  progress: number
  isUploading: boolean
  dragActive: boolean
  onDragActiveChange: (active: boolean) => void
  onFileSelect: (file: File | null) => void
}

type ContentEditorSection = {
  title: string
  description: string
  fields: Array<{
    key: SiteContentKey
    label: string
    kind?: 'image'
    recommendedSize?: string
    multiline?: boolean
    rows?: number
  }>
}

type ContentEditorPage = {
  id: string
  title: string
  description: string
  sections: ContentEditorSection[]
}

const noteColors = {
  CREAM: 'bg-[#F6EFCF]',
  BLUE: 'bg-[#DCEAF6]',
  BLUSH: 'bg-[#F4D9DE]',
  SAGE: 'bg-[#E2EEDB]',
}

const portraitRecommendedSize = '1200 x 1600 px, potret vertikal'
const galleryRecommendedSize = 'Potret 1200 x 1500 px atau landscape 1600 x 1200 px'

const contentEditorPages: ContentEditorPage[] = [
  {
    id: 'landing',
    title: 'Landing Page',
    description: 'Halaman depan publik, hero utama, editorial, dan penutup.',
    sections: [
      {
        title: 'Landing Hero',
        description: 'Judul utama, tombol, kartu pengantar, dan foto utama halaman landing.',
        fields: [
          { key: 'brand_name', label: 'Nama Merek' },
          { key: 'landing_eyebrow', label: 'Eyebrow Landing' },
          { key: 'landing_tagline', label: 'Tagline Landing' },
          { key: 'landing_description', label: 'Deskripsi Landing', multiline: true, rows: 4 },
          { key: 'landing_primary_cta', label: 'Tombol Utama' },
          { key: 'landing_secondary_cta', label: 'Tombol Kedua' },
          { key: 'landing_preview_photo_title', label: 'Label Kartu Foto' },
          { key: 'landing_preview_photo_heading', label: 'Judul Kartu Foto' },
          { key: 'landing_preview_photo_description', label: 'Deskripsi Kartu Foto', multiline: true, rows: 3 },
          { key: 'landing_preview_music_title', label: 'Label Kartu Musik' },
          { key: 'landing_preview_music_heading', label: 'Judul Kartu Musik' },
          { key: 'landing_preview_music_description', label: 'Deskripsi Kartu Musik', multiline: true, rows: 3 },
          { key: 'landing_preview_message_title', label: 'Label Kartu Pesan' },
          { key: 'landing_preview_message_heading', label: 'Judul Kartu Pesan' },
          { key: 'landing_preview_message_description', label: 'Deskripsi Kartu Pesan', multiline: true, rows: 3 },
          { key: 'landing_float_photo_title', label: 'Judul Kartu Foto Melayang' },
          { key: 'landing_float_photo_description', label: 'Deskripsi Kartu Foto Melayang' },
          { key: 'landing_float_music_title', label: 'Judul Kartu Musik Melayang' },
          { key: 'landing_float_music_description', label: 'Deskripsi Kartu Musik Melayang' },
          { key: 'landing_float_note_title', label: 'Judul Catatan Melayang' },
          { key: 'landing_float_note_description', label: 'Isi Catatan Melayang', multiline: true, rows: 3 },
          {
            key: 'landing_hero_image_url',
            label: 'Foto Hero Landing',
            kind: 'image',
            recommendedSize: portraitRecommendedSize,
          },
          { key: 'landing_hero_image_alt', label: 'Alt Foto Hero' },
          { key: 'landing_hero_overlay_eyebrow', label: 'Eyebrow Overlay Hero' },
          { key: 'landing_hero_overlay_title', label: 'Judul Overlay Hero', multiline: true, rows: 3 },
          { key: 'landing_hero_overlay_description', label: 'Deskripsi Overlay Hero', multiline: true, rows: 3 },
        ],
      },
      {
        title: 'Landing Editorial',
        description: 'Kartu highlight, narasi editorial, moodboard, dan dua foto tambahan landing.',
        fields: [
          { key: 'landing_feature_photo_title', label: 'Judul Fitur Foto' },
          { key: 'landing_feature_photo_description', label: 'Deskripsi Fitur Foto', multiline: true, rows: 3 },
          { key: 'landing_feature_music_title', label: 'Judul Fitur Musik' },
          { key: 'landing_feature_music_description', label: 'Deskripsi Fitur Musik', multiline: true, rows: 3 },
          { key: 'landing_feature_message_title', label: 'Judul Fitur Pesan' },
          { key: 'landing_feature_message_description', label: 'Deskripsi Fitur Pesan', multiline: true, rows: 3 },
          { key: 'landing_editorial_eyebrow', label: 'Eyebrow Editorial' },
          { key: 'landing_editorial_heading', label: 'Subjudul Editorial' },
          { key: 'landing_editorial_title', label: 'Judul Editorial Besar', multiline: true, rows: 4 },
          { key: 'landing_editorial_description', label: 'Deskripsi Editorial', multiline: true, rows: 4 },
          { key: 'landing_mood_notes', label: 'Mood Notes', multiline: true, rows: 4 },
          {
            key: 'landing_editorial_image_one_url',
            label: 'Foto Editorial 1',
            kind: 'image',
            recommendedSize: '900 x 1200 px, potret vertikal',
          },
          { key: 'landing_editorial_image_one_alt', label: 'Alt Foto Editorial 1' },
          { key: 'landing_editorial_image_one_caption', label: 'Caption Foto Editorial 1' },
          {
            key: 'landing_editorial_image_two_url',
            label: 'Foto Editorial 2',
            kind: 'image',
            recommendedSize: '900 x 1200 px, potret vertikal',
          },
          { key: 'landing_editorial_image_two_alt', label: 'Alt Foto Editorial 2' },
          { key: 'landing_editorial_image_two_caption', label: 'Caption Foto Editorial 2' },
          { key: 'landing_moodboard_eyebrow', label: 'Eyebrow Moodboard' },
          { key: 'landing_moodboard_title', label: 'Judul Moodboard', multiline: true, rows: 3 },
          { key: 'landing_moodboard_description', label: 'Deskripsi Moodboard', multiline: true, rows: 4 },
          { key: 'landing_visual_notes_eyebrow', label: 'Eyebrow Catatan Visual' },
          { key: 'landing_visual_note_one_title', label: 'Judul Catatan Visual 1' },
          { key: 'landing_visual_note_one_description', label: 'Isi Catatan Visual 1', multiline: true, rows: 3 },
          { key: 'landing_visual_note_two_title', label: 'Judul Catatan Visual 2' },
          { key: 'landing_visual_note_two_description', label: 'Isi Catatan Visual 2', multiline: true, rows: 3 },
          { key: 'landing_visual_note_three_title', label: 'Judul Catatan Visual 3' },
          { key: 'landing_visual_note_three_description', label: 'Isi Catatan Visual 3', multiline: true, rows: 3 },
        ],
      },
      {
        title: 'Landing Penutup',
        description: 'Surat pembuka, nada halaman, dan kartu ringkasan bagian bawah landing.',
        fields: [
          { key: 'landing_letter_eyebrow', label: 'Eyebrow Surat Pembuka' },
          { key: 'landing_letter_title', label: 'Judul Surat Pembuka', multiline: true, rows: 3 },
          { key: 'landing_letter_paragraphs', label: 'Paragraf Surat Pembuka', multiline: true, rows: 5 },
          { key: 'landing_tone_label', label: 'Label Nada Halaman' },
          { key: 'landing_tone_text', label: 'Isi Nada Halaman', multiline: true, rows: 2 },
          { key: 'landing_discover_eyebrow', label: 'Eyebrow Yang Akan Ditemukan' },
          { key: 'landing_discover_item_one_title', label: 'Judul Item Ditemukan 1' },
          { key: 'landing_discover_item_one_description', label: 'Isi Item Ditemukan 1', multiline: true, rows: 3 },
          { key: 'landing_discover_item_two_title', label: 'Judul Item Ditemukan 2' },
          { key: 'landing_discover_item_two_description', label: 'Isi Item Ditemukan 2', multiline: true, rows: 3 },
          { key: 'landing_ritual_eyebrow', label: 'Eyebrow Ritual Kecil' },
          { key: 'landing_ritual_one_title', label: 'Judul Ritual 1' },
          { key: 'landing_ritual_one_description', label: 'Isi Ritual 1', multiline: true, rows: 3 },
          { key: 'landing_ritual_two_title', label: 'Judul Ritual 2' },
          { key: 'landing_ritual_two_description', label: 'Isi Ritual 2', multiline: true, rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'public-login',
    title: 'Login Publik',
    description: 'Halaman masuk untuk pengguna biasa.',
    sections: [
      {
        title: 'Hero Login',
        description: 'Teks utama, foto, dan mood card untuk halaman login publik.',
        fields: [
          { key: 'public_login_eyebrow', label: 'Eyebrow Login' },
          { key: 'public_login_form_title', label: 'Judul Form Login', multiline: true, rows: 2 },
          { key: 'public_login_form_description', label: 'Deskripsi Form Login', multiline: true, rows: 3 },
          { key: 'public_login_showcase_title', label: 'Judul Showcase Login', multiline: true, rows: 3 },
          { key: 'public_login_showcase_description', label: 'Deskripsi Showcase Login', multiline: true, rows: 3 },
          { key: 'public_login_showcase_quote', label: 'Quote Showcase Login', multiline: true, rows: 3 },
          {
            key: 'public_login_image_url',
            label: 'Foto Login Publik',
            kind: 'image',
            recommendedSize: portraitRecommendedSize,
          },
          { key: 'public_login_image_alt', label: 'Alt Foto Login' },
        ],
      },
      {
        title: 'Kartu Pendukung Auth Publik',
        description: 'Dipakai bersama oleh halaman login dan register publik.',
        fields: [
          { key: 'public_auth_highlight_photo_title', label: 'Judul Kartu Foto' },
          { key: 'public_auth_highlight_photo_description', label: 'Deskripsi Kartu Foto', multiline: true, rows: 3 },
          { key: 'public_auth_highlight_music_title', label: 'Judul Kartu Musik' },
          { key: 'public_auth_highlight_music_description', label: 'Deskripsi Kartu Musik', multiline: true, rows: 3 },
          { key: 'public_auth_highlight_message_title', label: 'Judul Kartu Pesan' },
          { key: 'public_auth_highlight_message_description', label: 'Deskripsi Kartu Pesan', multiline: true, rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'public-signup',
    title: 'Register Publik',
    description: 'Halaman pendaftaran untuk pengguna biasa.',
    sections: [
      {
        title: 'Hero Register',
        description: 'Teks utama, foto, dan copy pendaftaran publik.',
        fields: [
          { key: 'public_signup_eyebrow', label: 'Eyebrow Register' },
          { key: 'public_signup_form_title', label: 'Judul Form Register', multiline: true, rows: 2 },
          { key: 'public_signup_form_description', label: 'Deskripsi Form Register', multiline: true, rows: 3 },
          { key: 'public_signup_showcase_title', label: 'Judul Showcase Register', multiline: true, rows: 3 },
          { key: 'public_signup_showcase_description', label: 'Deskripsi Showcase Register', multiline: true, rows: 3 },
          { key: 'public_signup_showcase_quote', label: 'Quote Showcase Register', multiline: true, rows: 3 },
          {
            key: 'public_signup_image_url',
            label: 'Foto Register Publik',
            kind: 'image',
            recommendedSize: portraitRecommendedSize,
          },
          { key: 'public_signup_image_alt', label: 'Alt Foto Register' },
        ],
      },
    ],
  },
  {
    id: 'admin-login',
    title: 'Login Super Admin',
    description: 'Portal masuk untuk super admin.',
    sections: [
      {
        title: 'Portal Login Super Admin',
        description: 'Teks utama, foto, dan kartu pendukung halaman login super admin.',
        fields: [
          { key: 'admin_auth_portal_title', label: 'Judul Portal Admin' },
          { key: 'admin_login_eyebrow', label: 'Eyebrow Login Admin' },
          { key: 'admin_login_showcase_title', label: 'Judul Showcase Login Admin', multiline: true, rows: 3 },
          { key: 'admin_login_showcase_description', label: 'Deskripsi Showcase Login Admin', multiline: true, rows: 3 },
          { key: 'admin_login_showcase_quote', label: 'Quote Showcase Login Admin', multiline: true, rows: 3 },
          {
            key: 'admin_login_image_url',
            label: 'Foto Login Admin',
            kind: 'image',
            recommendedSize: portraitRecommendedSize,
          },
          { key: 'admin_login_image_alt', label: 'Alt Foto Login Admin' },
          { key: 'admin_auth_highlight_access_title', label: 'Judul Kartu Akses' },
          { key: 'admin_auth_highlight_access_description', label: 'Deskripsi Kartu Akses', multiline: true, rows: 3 },
          { key: 'admin_auth_highlight_content_title', label: 'Judul Kartu Konten' },
          { key: 'admin_auth_highlight_content_description', label: 'Deskripsi Kartu Konten', multiline: true, rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'admin-signup',
    title: 'Register Super Admin',
    description: 'Tab pendaftaran super admin di portal admin.',
    sections: [
      {
        title: 'Portal Register Super Admin',
        description: 'Copy dan foto untuk halaman pendaftaran super admin.',
        fields: [
          { key: 'admin_signup_eyebrow', label: 'Eyebrow Register Admin' },
          { key: 'admin_signup_showcase_title', label: 'Judul Showcase Register Admin', multiline: true, rows: 3 },
          { key: 'admin_signup_showcase_description', label: 'Deskripsi Showcase Register Admin', multiline: true, rows: 3 },
          { key: 'admin_signup_showcase_quote', label: 'Quote Showcase Register Admin', multiline: true, rows: 3 },
          {
            key: 'admin_signup_image_url',
            label: 'Foto Register Admin',
            kind: 'image',
            recommendedSize: portraitRecommendedSize,
          },
          { key: 'admin_signup_image_alt', label: 'Alt Foto Register Admin' },
        ],
      },
    ],
  },
  {
    id: 'member-home',
    title: 'Beranda Member',
    description: 'Halaman utama setelah pengguna berhasil masuk.',
    sections: [
      {
        title: 'Beranda Member',
        description: 'Teks utama yang tampil setelah pengguna berhasil masuk.',
        fields: [
          { key: 'home_title', label: 'Judul Beranda' },
          { key: 'home_description', label: 'Deskripsi Beranda', multiline: true, rows: 3 },
          { key: 'about_title', label: 'Judul Bagian Tentang' },
          { key: 'about_description', label: 'Deskripsi Bagian Tentang', multiline: true, rows: 4 },
          { key: 'favorites_title', label: 'Judul Bagian Favorit' },
          { key: 'favorites_items', label: 'Daftar Favorit', multiline: true, rows: 4 },
          { key: 'featured_music_title', label: 'Judul Musik Pilihan' },
          { key: 'recent_photos_title', label: 'Judul Foto Terbaru' },
          { key: 'recent_photos_cta', label: 'Tombol Foto Terbaru' },
        ],
      },
    ],
  },
  {
    id: 'messages',
    title: 'Pesan',
    description: 'Halaman buku tamu, judul pesan, dan placeholder kirim pesan.',
    sections: [
      {
        title: 'Halaman Pesan',
        description: 'Judul utama dan area tulis pesan.',
        fields: [
          { key: 'message_wall_title', label: 'Label Halaman Pesan' },
          { key: 'messages_page_heading', label: 'Judul Besar Halaman Pesan', multiline: true, rows: 3 },
          { key: 'messages_page_description', label: 'Deskripsi Halaman Pesan', multiline: true, rows: 4 },
          { key: 'message_wall_placeholder', label: 'Placeholder Tulis Pesan', multiline: true, rows: 2 },
        ],
      },
    ],
  },
  {
    id: 'gallery',
    title: 'Galeri',
    description: 'Judul dan deskripsi halaman galeri publik.',
    sections: [
      {
        title: 'Halaman Galeri',
        description: 'Copy utama halaman galeri. Upload foto tetap dilakukan di menu Foto.',
        fields: [
          { key: 'gallery_title', label: 'Label Halaman Galeri' },
          { key: 'gallery_heading', label: 'Judul Besar Halaman Galeri', multiline: true, rows: 3 },
          { key: 'gallery_description', label: 'Deskripsi Halaman Galeri', multiline: true, rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'music',
    title: 'Musik',
    description: 'Judul dan deskripsi halaman musik publik.',
    sections: [
      {
        title: 'Halaman Musik',
        description: 'Copy utama halaman musik. Koleksi musik tetap dikelola dari menu musik.',
        fields: [
          { key: 'music_page_title', label: 'Label Halaman Musik' },
          { key: 'music_page_heading', label: 'Judul Besar Halaman Musik', multiline: true, rows: 3 },
          { key: 'music_page_description', label: 'Deskripsi Halaman Musik', multiline: true, rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'admin-dashboard',
    title: 'Dashboard Admin',
    description: 'Judul, deskripsi, dan kartu penting area admin.',
    sections: [
      {
        title: 'Dashboard Admin',
        description: 'Teks untuk area dasbor admin dan kartu penting di dalamnya.',
        fields: [
          { key: 'admin_dashboard_title', label: 'Judul Dasbor' },
          { key: 'admin_dashboard_description', label: 'Deskripsi Dasbor', multiline: true, rows: 3 },
          { key: 'admin_activity_title', label: 'Judul Kartu Aktivitas' },
          { key: 'admin_activity_description', label: 'Deskripsi Kartu Aktivitas', multiline: true, rows: 3 },
          { key: 'admin_photos_title', label: 'Judul Kartu Foto' },
          { key: 'admin_photos_description', label: 'Deskripsi Kartu Foto', multiline: true, rows: 3 },
          { key: 'admin_content_title', label: 'Judul Editor Konten' },
          { key: 'admin_content_description', label: 'Deskripsi Editor Konten', multiline: true, rows: 3 },
        ],
      },
    ],
  },
  {
    id: 'global',
    title: 'Global',
    description: 'Elemen umum yang dipakai lintas halaman.',
    sections: [
      {
        title: 'Identitas & Footer',
        description: 'Nama brand dan footer umum website.',
        fields: [
          { key: 'brand_name', label: 'Nama Merek' },
          { key: 'footer_text', label: 'Teks Footer', multiline: true, rows: 2 },
        ],
      },
    ],
  },
]

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Permintaan gagal')
  }

  return data as T
}

async function uploadImageFile(
  kind: 'avatar' | 'photo' | 'content',
  file: File,
  onProgress?: (value: number) => void,
) {
  const formData = new FormData()
  formData.append('kind', kind)
  formData.append('file', file)

  return await new Promise<{
    publicUrl: string
    objectPath: string
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', '/api/uploads/image')
    xhr.responseType = 'json'
    xhr.withCredentials = true

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) {
        return
      }

      onProgress(Math.round((event.loaded / event.total) * 100))
    })

    xhr.addEventListener('load', () => {
      const data = xhr.response ?? {}

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(data)
        return
      }

      reject(new Error(data.error || 'Gagal mengunggah gambar'))
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Gagal mengunggah gambar'))
    })

    xhr.send(formData)
  })
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    AVATAR_UPLOADED: 'Avatar diunggah',
    MUSIC_CREATED: 'Musik dibuat',
    MUSIC_UPDATED: 'Musik diperbarui',
    MUSIC_DELETED: 'Musik dihapus',
    PHOTO_UPLOADED: 'Foto diunggah',
    PHOTO_UPDATED: 'Foto diperbarui',
    PHOTO_DELETED: 'Foto dihapus',
    COMMENT_HIDDEN: 'Komentar disembunyikan',
    COMMENT_UNHIDDEN: 'Komentar ditampilkan',
    COMMENT_DELETED: 'Komentar dihapus',
    PHOTO_REORDERED: 'Urutan foto diubah',
    CONTENT_UPDATED: 'Konten diperbarui',
    USER_ROLE_CHANGED: 'Peran pengguna diubah',
    USER_STATUS_CHANGED: 'Status pengguna diubah',
    USER_APPROVAL_CHANGED: 'Persetujuan pengguna diubah',
    USER_DELETED: 'Pengguna dihapus',
    PHOTO_CREATED: 'Foto dibuat',
    PROFILE_UPDATED: 'Profil diperbarui',
    PASSWORD_UPDATED: 'Password diperbarui',
  }

  return labels[action] || action
}

function formatAuditTargetType(targetType: string) {
  const labels: Record<string, string> = {
    user: 'Pengguna',
    photo: 'Foto',
    comment: 'Komentar',
    content: 'Konten',
    music: 'Musik',
  }

  return labels[targetType] || targetType
}

function formatRoleLabel(role?: UserRole) {
  if (role === 'SUPER_ADMIN') {
    return 'Super Admin'
  }

  if (role === 'USER') {
    return 'Pengguna'
  }

  return role || '-'
}

function formatApprovalLabel(status?: DashboardUser['approvalStatus']) {
  if (status === 'PENDING') {
    return 'Menunggu'
  }

  if (status === 'REJECTED') {
    return 'Ditolak'
  }

  return 'Disetujui'
}

function approvalBadgeClass(status?: DashboardUser['approvalStatus']) {
  if (status === 'PENDING') {
    return 'bg-[#F6EFCF] text-[#2F2A2A]'
  }

  if (status === 'REJECTED') {
    return 'bg-[#F4D9DE] text-[#2F2A2A]'
  }

  return 'bg-[#E2EEDB] text-[#2F2A2A]'
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID')
}

function UploadDropzone({
  id,
  label,
  hint,
  recommendedSize,
  file,
  progress,
  isUploading,
  dragActive,
  onDragActiveChange,
  onFileSelect,
}: UploadDropzoneProps) {
  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    onDragActiveChange(false)

    const droppedFile = event.dataTransfer.files?.[0] || null
    onFileSelect(droppedFile)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition ${
          dragActive
            ? 'border-[#E8BFCB] bg-[#E8BFCB]/15'
            : 'border-[#EADCCF] bg-[#F7F4EF] hover:bg-[#FFFDF9]'
        }`}
        onDragEnter={() => onDragActiveChange(true)}
        onDragLeave={() => onDragActiveChange(false)}
        onDragOver={(event) => {
          event.preventDefault()
          onDragActiveChange(true)
        }}
        onDrop={handleDrop}
      >
        <input
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
        />
        <UploadCloud className="h-6 w-6 text-[#2F2A2A]" />
        <p className="mt-3 text-sm font-medium text-[#2F2A2A]">
          Tarik dan lepas gambar di sini
        </p>
        <p className="mt-1 text-xs text-[#6E6666]">{hint}</p>
        {recommendedSize && (
          <p className="mt-2 rounded-full bg-[#FFF7F8] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8B7676]">
            Ukuran rekomendasi: {recommendedSize}
          </p>
        )}
        {file && (
          <p className="mt-3 text-xs text-[#2F2A2A]">
            Dipilih: {file.name}
          </p>
        )}
      </label>
      {(isUploading || progress > 0) && (
        <div className="space-y-2">
          <Progress
            value={progress}
            className="h-2 bg-[#EADCCF] [&_[data-slot=progress-indicator]]:bg-[#E8BFCB]"
          />
          <p className="text-xs text-[#6E6666]">
            {isUploading ? `Mengunggah... ${progress}%` : `Terunggah ${progress}%`}
          </p>
        </div>
      )}
    </div>
  )
}

type ContentImagePreviewProps = {
  fieldKey: SiteContentKey
  label: string
  contentForm: SiteContentMap
}

function ContentImagePreview({ fieldKey, label, contentForm }: ContentImagePreviewProps) {
  const imageUrl = contentForm[fieldKey]

  const renderEmptyState = (className: string) => (
    <div className={className}>
      <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-[#EADCCF] bg-[#F7F4EF] text-sm text-[#6E6666]">
        Belum ada gambar untuk field ini.
      </div>
    </div>
  )

  if (fieldKey === 'landing_hero_image_url') {
    return (
      <div className="mx-auto w-full max-w-[34rem]">
        <div className="relative rounded-[2.4rem] border border-[#EADCCF] bg-[#FFF8F7]/85 p-3 shadow-[0_34px_90px_-38px_rgba(47,42,42,0.5)]">
          <div className="absolute inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_rgba(255,255,255,0))]" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#F5E6DE] bg-[#EADCCF]">
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={contentForm.landing_hero_image_alt || label}
                  className="h-[28rem] w-full object-cover object-center sm:h-[38rem]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2F2A2A]/78 via-[#2F2A2A]/35 to-transparent px-6 pb-7 pt-20 text-[#FFFDF9]">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#F6D8E0]">
                    {contentForm.landing_hero_overlay_eyebrow}
                  </p>
                  <p className="mt-4 max-w-sm font-serif text-3xl leading-tight">
                    {contentForm.landing_hero_overlay_title}
                  </p>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[#F8F1F1]">
                    {contentForm.landing_hero_overlay_description}
                  </p>
                </div>
              </>
            ) : (
              renderEmptyState('h-[28rem] sm:h-[38rem]')
            )}
          </div>
        </div>
      </div>
    )
  }

  if (fieldKey === 'landing_editorial_image_one_url' || fieldKey === 'landing_editorial_image_two_url') {
    const caption =
      fieldKey === 'landing_editorial_image_one_url'
        ? contentForm.landing_editorial_image_one_caption
        : contentForm.landing_editorial_image_two_caption
    const alt =
      fieldKey === 'landing_editorial_image_one_url'
        ? contentForm.landing_editorial_image_one_alt
        : contentForm.landing_editorial_image_two_alt

    return (
      <div className="mx-auto w-full max-w-[22rem] overflow-hidden rounded-[2rem] border border-[#EADCCF] bg-[#FFFDF9] p-3 shadow-[0_24px_60px_-38px_rgba(47,42,42,0.4)]">
        <div className="overflow-hidden rounded-[1.45rem]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={alt || label}
              className="h-72 w-full object-cover sm:h-80"
            />
          ) : (
            renderEmptyState('h-72 sm:h-80')
          )}
        </div>
        <p className="px-2 pb-2 pt-4 text-sm text-[#6E6666]">
          {caption || 'Caption foto akan tampil di sini seperti pada landing page.'}
        </p>
      </div>
    )
  }

  if (
    fieldKey === 'public_login_image_url' ||
    fieldKey === 'public_signup_image_url' ||
    fieldKey === 'admin_login_image_url' ||
    fieldKey === 'admin_signup_image_url'
  ) {
    const altMap: Partial<Record<SiteContentKey, string>> = {
      public_login_image_url: contentForm.public_login_image_alt,
      public_signup_image_url: contentForm.public_signup_image_alt,
      admin_login_image_url: contentForm.admin_login_image_alt,
      admin_signup_image_url: contentForm.admin_signup_image_alt,
    }

    return (
      <div className="mx-auto w-full max-w-[34rem]">
        <div className="overflow-hidden rounded-[2.5rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-4 shadow-[0_34px_90px_-45px_rgba(47,42,42,0.48)]">
          <div className="overflow-hidden rounded-[2rem]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={altMap[fieldKey] || label}
                className="h-[24rem] w-full object-cover object-center sm:h-[42rem]"
              />
            ) : (
              renderEmptyState('h-[24rem] sm:h-[42rem]')
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[1.3rem] border border-[#EADCCF] bg-[#F7F4EF]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          className="h-56 w-full object-cover"
        />
      ) : (
        renderEmptyState('h-56')
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { user, currentView, setUser, setCurrentView, logout, isAdmin, isSuperAdmin } = useAppStore()
  const [activeTab, setActiveTab] = useState(
    currentView === 'admin-photos'
      ? 'photos'
      : currentView === 'admin-music'
        ? 'music'
        : currentView === 'admin-comments'
          ? 'comments'
          : currentView === 'admin-users'
            ? 'users'
            : currentView === 'admin-content'
              ? 'content'
              : currentView === 'admin-settings'
                ? 'settings'
                : 'overview'
  )
  const [contentEditMode, setContentEditMode] = useState(false)
  const [contentDirty, setContentDirty] = useState(false)
  const [activeContentPage, setActiveContentPage] = useState(contentEditorPages[0]?.id ?? 'landing')
  const [users, setUsers] = useState<DashboardUser[]>([])
  const [photos, setPhotos] = useState<DashboardPhoto[]>([])
  const [musicItems, setMusicItems] = useState<DashboardMusic[]>([])
  const [comments, setComments] = useState<DashboardComment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [dashboardError, setDashboardError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [contentMessage, setContentMessage] = useState('')
  const [contentImageUploadProgress, setContentImageUploadProgress] = useState<Record<string, number>>({})
  const [contentImageStatus, setContentImageStatus] = useState<Partial<Record<SiteContentKey, string>>>({})
  const [photoOrderMessage, setPhotoOrderMessage] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [contentForm, setContentForm] = useState<SiteContentMap>(DEFAULT_SITE_CONTENT)

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [newPhoto, setNewPhoto] = useState({
    imageUrl: '',
    caption: '',
    featured: false,
  })
  const [newMusic, setNewMusic] = useState({
    title: '',
    spotifyUrl: '',
    type: 'playlist' as DashboardMusic['type'],
    featured: false,
    order: '',
  })
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<Record<string, File | null>>({})
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0)
  const [newPhotoUploadProgress, setNewPhotoUploadProgress] = useState(0)
  const [photoUploadProgress, setPhotoUploadProgress] = useState<Record<string, number>>({})
  const [avatarDragActive, setAvatarDragActive] = useState(false)
  const [newPhotoDragActive, setNewPhotoDragActive] = useState(false)
  const [photoDragActive, setPhotoDragActive] = useState<Record<string, boolean>>({})
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null)
  const [dragOverPhotoId, setDragOverPhotoId] = useState<string | null>(null)
  const [photoOrderDirty, setPhotoOrderDirty] = useState(false)
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null)

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      avatarUrl: user?.avatarUrl || '',
    })
  }, [user])

  useEffect(() => {
    if (!isAdmin() && !isSuperAdmin()) {
      setCurrentView('home')
      return
    }

    const loadDashboard = async () => {
      setLoading(true)
      setDashboardError('')

      try {
        const [usersData, photosData, musicData, commentsData, logsData, contentData] = await Promise.all([
          requestJson<{ users: DashboardUser[] }>('/api/users'),
          requestJson<{ photos: DashboardPhoto[] }>('/api/photos'),
          requestJson<{ musicItems: DashboardMusic[] }>('/api/music'),
          requestJson<{ comments: DashboardComment[] }>('/api/comments'),
          requestJson<{ logs: AuditLog[] }>('/api/admin/audit-logs?limit=10'),
          requestJson<{ content: Partial<Record<string, string>> }>('/api/content'),
        ])

        setUsers(usersData.users)
        setPhotos(photosData.photos)
        setMusicItems(musicData.musicItems)
        setComments(commentsData.comments)
        setAuditLogs(logsData.logs)
        setContentForm(normalizeSiteContent(contentData.content))
        setContentDirty(false)
        setContentImageStatus({})
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal memuat dashboard admin'
        setDashboardError(message)

        if (message.includes('Silakan login terlebih dahulu') || message.includes('Akses admin diperlukan')) {
          setUser(null)
          setCurrentView('login')
        }
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [isAdmin, isSuperAdmin, setCurrentView, setUser])

  const refreshUsers = async () => {
    const data = await requestJson<{ users: DashboardUser[] }>('/api/users')
    setUsers(data.users)
  }

  const refreshPhotos = async () => {
    const data = await requestJson<{ photos: DashboardPhoto[] }>('/api/photos')
    setPhotos(data.photos)
    setPhotoOrderDirty(false)
    setDraggedPhotoId(null)
    setDragOverPhotoId(null)
  }

  const refreshComments = async () => {
    const data = await requestJson<{ comments: DashboardComment[] }>('/api/comments')
    setComments(data.comments)
  }

  const refreshMusic = async () => {
    const data = await requestJson<{ musicItems: DashboardMusic[] }>('/api/music')
    setMusicItems(data.musicItems)
  }

  const refreshAuditLogs = async () => {
    const data = await requestJson<{ logs: AuditLog[] }>('/api/admin/audit-logs?limit=10')
    setAuditLogs(data.logs)
  }

  const refreshContent = async () => {
    const data = await requestJson<{ content: Partial<Record<string, string>> }>('/api/content')
    setContentForm(normalizeSiteContent(data.content))
    setContentDirty(false)
    setContentImageStatus({})
  }

  const renderUserManagementActions = (item: DashboardUser) => {
    const canManageRole = isSuperAdmin() && item.id !== user?.id
    const canToggleActive = item.role === 'USER' && item.id !== user?.id && item.approvalStatus === 'APPROVED'
    const canReviewUser = item.role === 'USER' && item.id !== user?.id
    const canDeleteUser = isSuperAdmin() && item.id !== user?.id

    return (
      <>
        {canReviewUser && item.approvalStatus !== 'APPROVED' && (
          <Button
            variant="outline"
            className="border-[#D7E6D5]"
            onClick={() => void handleApprovalChange(item, 'APPROVED')}
            disabled={actionLoading === `approval-${item.id}`}
          >
            Terima
          </Button>
        )}

        {canReviewUser && item.approvalStatus !== 'REJECTED' && (
          <Button
            variant="outline"
            className="border-[#F4D9DE] text-[#2F2A2A] hover:bg-[#F4D9DE]/30"
            onClick={() => void handleApprovalChange(item, 'REJECTED')}
            disabled={actionLoading === `approval-${item.id}`}
          >
            Tolak
          </Button>
        )}

        {canToggleActive && (
          <Button
            variant="outline"
            className="border-[#EADCCF]"
            onClick={() => void handleUserActiveToggle(item)}
            disabled={actionLoading === `user-${item.id}`}
          >
            {item.isActive ? 'Tangguhkan' : 'Pulihkan'}
          </Button>
        )}

        {canManageRole && item.role === 'USER' && (
          <Button
            variant="outline"
            className="border-[#EADCCF]"
            onClick={() => void handleRoleChange(item, 'SUPER_ADMIN')}
            disabled={actionLoading === `role-${item.id}`}
          >
            Jadikan Super Admin
          </Button>
        )}

        {canManageRole && item.role === 'SUPER_ADMIN' && (
          <Button
            variant="outline"
            className="border-[#EADCCF]"
            onClick={() => void handleRoleChange(item, 'USER')}
            disabled={actionLoading === `role-${item.id}`}
          >
            Turunkan ke Pengguna
          </Button>
        )}

        {canDeleteUser && (
          <Button
            variant="outline"
            className="border-[#F4D9DE] text-red-600 hover:bg-[#F4D9DE]/30"
            onClick={() => void handleUserDelete(item)}
            disabled={actionLoading === `user-delete-${item.id}`}
          >
            Hapus
          </Button>
        )}
      </>
    )
  }

  const reindexPhotos = (photoList: DashboardPhoto[]) =>
    photoList.map((photo, index) => ({
      ...photo,
      order: index,
    }))

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage('')
    setActionLoading('profile')

    try {
      let nextAvatarUrl = profileForm.avatarUrl

      if (avatarFile) {
        setAvatarUploadProgress(0)
        const uploaded = await uploadImageFile('avatar', avatarFile, setAvatarUploadProgress)
        nextAvatarUrl = uploaded.publicUrl
      }

      const data = await requestJson<{ user: DashboardUser }>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          ...profileForm,
          avatarUrl: nextAvatarUrl,
        }),
      })
      setUser(data.user)
      setProfileForm((current) => ({
        ...current,
        avatarUrl: data.user.avatarUrl || '',
      }))
      setAvatarFile(null)
      await refreshAuditLogs()
      setProfileMessage('Profil admin berhasil diperbarui.')
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Gagal memperbarui profil')
    } finally {
      setAvatarUploadProgress(0)
      setAvatarDragActive(false)
      setActionLoading(null)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Password baru dan konfirmasi password harus sama.')
      return
    }

    setActionLoading('password')

    try {
      await requestJson('/api/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      await refreshAuditLogs()
      setPasswordMessage('Password admin berhasil diperbarui.')
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Gagal memperbarui password')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreatePhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    setDashboardError('')
    setActionLoading('create-photo')

    try {
      let nextImageUrl = newPhoto.imageUrl

      if (newPhotoFile) {
        setNewPhotoUploadProgress(0)
        const uploaded = await uploadImageFile('photo', newPhotoFile, setNewPhotoUploadProgress)
        nextImageUrl = uploaded.publicUrl
      }

      if (!nextImageUrl) {
        throw new Error('Pilih file foto atau isi URL gambar.')
      }

      await requestJson('/api/photos', {
        method: 'POST',
        body: JSON.stringify({
          ...newPhoto,
          imageUrl: nextImageUrl,
        }),
      })
      setNewPhoto({
        imageUrl: '',
        caption: '',
        featured: false,
      })
      setNewPhotoFile(null)
      setNewPhotoDragActive(false)
      await refreshPhotos()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal menambahkan foto')
    } finally {
      setNewPhotoUploadProgress(0)
      setActionLoading(null)
    }
  }

  const handlePhotoFieldChange = (photoId: string, field: keyof DashboardPhoto, value: string | boolean | number | null) => {
    setPhotos((current) => {
      if (field !== 'order') {
        return current.map((photo) => (photo.id === photoId ? { ...photo, [field]: value } : photo))
      }

      const sourceIndex = current.findIndex((photo) => photo.id === photoId)
      if (sourceIndex === -1) {
        return current
      }

      const nextPhotos = [...current]
      const [movedPhoto] = nextPhotos.splice(sourceIndex, 1)
      const requestedIndex = Math.max(0, Math.min(Number(value) || 0, nextPhotos.length))
      nextPhotos.splice(requestedIndex, 0, movedPhoto)
      return reindexPhotos(nextPhotos)
    })

    if (field === 'order') {
      setPhotoOrderDirty(true)
      setPhotoOrderMessage('Urutan foto berubah. Simpan agar urutan baru tersimpan ke database.')
    }
  }

  const handlePhotoSave = async (photo: DashboardPhoto) => {
    setActionLoading(`photo-${photo.id}`)
    setDashboardError('')

    try {
      let nextImageUrl = photo.imageUrl
      const replacementFile = photoFiles[photo.id]

      if (replacementFile) {
        setPhotoUploadProgress((current) => ({
          ...current,
          [photo.id]: 0,
        }))
        const uploaded = await uploadImageFile('photo', replacementFile, (value) => {
          setPhotoUploadProgress((current) => ({
            ...current,
            [photo.id]: value,
          }))
        })
        nextImageUrl = uploaded.publicUrl
      }

      await requestJson(`/api/photos/${photo.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          imageUrl: nextImageUrl,
          caption: photo.caption,
          order: photo.order,
          featured: photo.featured,
        }),
      })
      setPhotoFiles((current) => ({
        ...current,
        [photo.id]: null,
      }))
      setPhotoDragActive((current) => ({
        ...current,
        [photo.id]: false,
      }))
      await refreshPhotos()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal memperbarui foto')
    } finally {
      setPhotoUploadProgress((current) => ({
        ...current,
        [photo.id]: 0,
      }))
      setActionLoading(null)
    }
  }

  const handlePhotoDelete = async (photoId: string) => {
    if (!window.confirm('Hapus foto ini dari galeri? File gambar dan data di database akan ikut dihapus.')) {
      return
    }

    setActionLoading(`photo-delete-${photoId}`)
    setDashboardError('')

    try {
      await requestJson(`/api/photos/${photoId}`, {
        method: 'DELETE',
      })
      if (expandedPhotoId === photoId) {
        setExpandedPhotoId(null)
      }
      await refreshPhotos()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal menghapus foto')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateMusic = async (e: React.FormEvent) => {
    e.preventDefault()
    setDashboardError('')
    setActionLoading('create-music')

    try {
      await requestJson('/api/music', {
        method: 'POST',
        body: JSON.stringify({
          title: newMusic.title,
          spotifyUrl: newMusic.spotifyUrl,
          type: newMusic.type,
          featured: newMusic.featured,
          order: newMusic.order === '' ? undefined : Number(newMusic.order),
        }),
      })
      setNewMusic({
        title: '',
        spotifyUrl: '',
        type: 'playlist',
        featured: false,
        order: '',
      })
      await refreshMusic()
      await refreshAuditLogs()
      window.dispatchEvent(new Event('awrella-music-updated'))
      window.localStorage.setItem('awrella-music-updated-at', String(Date.now()))
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal menambahkan musik')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMusicFieldChange = (
    musicId: string,
    field: keyof DashboardMusic,
    value: string | boolean | number,
  ) => {
    setMusicItems((current) =>
      current.map((item) => (item.id === musicId ? { ...item, [field]: value } : item))
    )
  }

  const handleMusicSave = async (item: DashboardMusic) => {
    setActionLoading(`music-${item.id}`)
    setDashboardError('')

    try {
      await requestJson(`/api/music/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: item.title,
          spotifyUrl: item.spotifyUrl,
          type: item.type,
          featured: item.featured,
          order: item.order,
        }),
      })
      await refreshMusic()
      await refreshAuditLogs()
      window.dispatchEvent(new Event('awrella-music-updated'))
      window.localStorage.setItem('awrella-music-updated-at', String(Date.now()))
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal memperbarui musik')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMusicDelete = async (musicId: string) => {
    setActionLoading(`music-delete-${musicId}`)
    setDashboardError('')

    try {
      await requestJson(`/api/music/${musicId}`, {
        method: 'DELETE',
      })
      await refreshMusic()
      await refreshAuditLogs()
      window.dispatchEvent(new Event('awrella-music-updated'))
      window.localStorage.setItem('awrella-music-updated-at', String(Date.now()))
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal menghapus musik')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePhotoDragStart = (photoId: string) => {
    setDraggedPhotoId(photoId)
    setDragOverPhotoId(photoId)
    setPhotoOrderMessage('Lepas foto di posisi baru, lalu klik Simpan Urutan Foto.')
  }

  const handlePhotoDrop = (targetPhotoId: string) => {
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) {
      setDraggedPhotoId(null)
      setDragOverPhotoId(null)
      return
    }

    setPhotos((current) => {
      const sourceIndex = current.findIndex((photo) => photo.id === draggedPhotoId)
      const targetIndex = current.findIndex((photo) => photo.id === targetPhotoId)

      if (sourceIndex === -1 || targetIndex === -1) {
        return current
      }

      const nextPhotos = [...current]
      const [draggedPhoto] = nextPhotos.splice(sourceIndex, 1)
      nextPhotos.splice(targetIndex, 0, draggedPhoto)
      return reindexPhotos(nextPhotos)
    })

    setPhotoOrderDirty(true)
    setDraggedPhotoId(null)
    setDragOverPhotoId(null)
    setPhotoOrderMessage('Urutan foto sudah diubah. Klik Simpan Urutan Foto untuk menyimpan.')
  }

  const handleSavePhotoOrder = async () => {
    setActionLoading('photo-order')
    setDashboardError('')

    try {
      await requestJson('/api/photos/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          photoOrders: photos.map((photo, index) => ({
            id: photo.id,
            order: index,
          })),
        }),
      })
      await refreshPhotos()
      await refreshAuditLogs()
      setPhotoOrderMessage('Urutan foto berhasil disimpan.')
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal menyimpan urutan foto')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUserActiveToggle = async (targetUser: DashboardUser) => {
    setActionLoading(`user-${targetUser.id}`)
    setDashboardError('')

    try {
      await requestJson(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          isActive: !targetUser.isActive,
        }),
      })
      await refreshUsers()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal memperbarui status pengguna')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRoleChange = async (targetUser: DashboardUser, nextRole: DashboardUser['role']) => {
    setActionLoading(`role-${targetUser.id}`)
    setDashboardError('')

    try {
      await requestJson(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          role: nextRole,
        }),
      })
      await refreshUsers()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal memperbarui peran pengguna')
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprovalChange = async (
    targetUser: DashboardUser,
    nextApprovalStatus: DashboardUser['approvalStatus'],
  ) => {
    setActionLoading(`approval-${targetUser.id}`)
    setDashboardError('')

    try {
      await requestJson(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          approvalStatus: nextApprovalStatus,
          isActive: nextApprovalStatus === 'APPROVED' ? true : targetUser.isActive,
        }),
      })
      await refreshUsers()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal memperbarui persetujuan pengguna')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUserDelete = async (targetUser: DashboardUser) => {
    setActionLoading(`user-delete-${targetUser.id}`)
    setDashboardError('')

    try {
      await requestJson(`/api/users/${targetUser.id}`, {
        method: 'DELETE',
      })
      await refreshUsers()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal menghapus pengguna')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCommentHiddenToggle = async (comment: DashboardComment) => {
    setActionLoading(`comment-${comment.id}`)
    setDashboardError('')

    try {
      await requestJson(`/api/comments/${comment.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          hidden: !comment.hidden,
        }),
      })
      await refreshComments()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal memperbarui komentar')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCommentDelete = async (commentId: string) => {
    setActionLoading(`comment-delete-${commentId}`)
    setDashboardError('')

    try {
      await requestJson(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })
      await refreshComments()
      await refreshAuditLogs()
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Gagal menghapus komentar')
    } finally {
      setActionLoading(null)
    }
  }

  const handleContentFieldChange = (key: SiteContentKey, value: string) => {
    setContentForm((current) => ({
      ...current,
      [key]: value,
    }))
    setContentDirty(true)
  }

  const handleContentImageUpload = async (key: SiteContentKey, file: File | null) => {
    if (!file) {
      return
    }

    setActionLoading(`content-image-${key}`)
    setContentMessage('')
    setContentImageStatus((current) => ({
      ...current,
      [key]: '',
    }))

    try {
      setContentImageUploadProgress((current) => ({
        ...current,
        [key]: 0,
      }))

      const uploaded = await uploadImageFile('content', file, (value) => {
        setContentImageUploadProgress((current) => ({
          ...current,
          [key]: value,
        }))
      })

      setContentForm((current) => ({
        ...current,
        [key]: uploaded.publicUrl,
      }))
      setContentDirty(true)
      const successMessage = 'Gambar berhasil diunggah. Klik Simpan Konten untuk menyimpan perubahan.'
      setContentMessage(successMessage)
      setContentImageStatus((current) => ({
        ...current,
        [key]: successMessage,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengunggah gambar konten'
      setContentMessage(errorMessage)
      setContentImageStatus((current) => ({
        ...current,
        [key]: errorMessage,
      }))
    } finally {
      setContentImageUploadProgress((current) => ({
        ...current,
        [key]: 0,
      }))
      setActionLoading(null)
    }
  }

  const handleContentSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setContentMessage('')

    if (!contentEditMode) {
      setContentMessage('Aktifkan mode edit terlebih dahulu untuk mengubah konten.')
      return
    }

    setActionLoading('content')

    try {
      await requestJson('/api/content', {
        method: 'PUT',
        body: JSON.stringify({
          content: contentForm,
        }),
      })

      await refreshContent()
      await refreshAuditLogs()
      window.dispatchEvent(new Event('awrella-content-updated'))
      window.localStorage.setItem('awrella-content-updated-at', String(Date.now()))
      setContentMessage('Konten website berhasil diperbarui.')
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : 'Gagal memperbarui konten')
    } finally {
      setActionLoading(null)
    }
  }

  const contentBusy =
    actionLoading === 'content' || Boolean(actionLoading?.startsWith('content-image-'))
  const selectedContentPage =
    contentEditorPages.find((page) => page.id === activeContentPage) || contentEditorPages[0]
  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab)

    if (nextTab === 'overview') {
      setCurrentView('admin')
      return
    }

    if (nextTab === 'photos') {
      setCurrentView('admin-photos')
      return
    }

    if (nextTab === 'music') {
      setCurrentView('admin-music')
      return
    }

    if (nextTab === 'comments') {
      setCurrentView('admin-comments')
      return
    }

    if (nextTab === 'users') {
      setCurrentView('admin-users')
      return
    }

    if (nextTab === 'content') {
      setCurrentView('admin-content')
      return
    }

    if (nextTab === 'settings') {
      setCurrentView('admin-settings')
    }
  }

  const handleAdminLogout = async () => {
    setActionLoading('admin-logout')

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
      })
    } catch (error) {
      console.error('Failed to log out admin:', error)
    } finally {
      logout()
      window.location.assign('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4EF] px-4">
        <Card className="w-full max-w-lg bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
          <CardContent className="py-12 text-center text-[#6E6666]">
            Sedang memuat dashboard admin...
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalVisitors = users.filter((item) => item.role === 'USER').length
  const totalAdmins = users.filter((item) => item.role !== 'USER').length
  const visibleComments = comments.filter((item) => !item.hidden).length
  const recentJoinedUsers = users
    .filter((item) => item.role === 'USER')
    .slice(0, 6)

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EF]">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-serif text-[#2F2A2A]">{contentForm.admin_dashboard_title}</h1>
              <p className="text-[#6E6666]">
                {contentForm.admin_dashboard_description}
              </p>
            </div>
            <div className="flex justify-start md:justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full min-w-[18rem] items-center gap-3 rounded-2xl border border-[#EADCCF] bg-[#FFFDF9] px-4 py-3 text-left shadow-sm transition hover:bg-[#FFF7F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8BFCB] md:w-auto"
                    aria-label="Buka menu admin"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || user?.email} />
                      <AvatarFallback className="bg-[#E8BFCB]/30 text-[#2F2A2A]">
                        {user?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#2F2A2A]">{user?.name || user?.email}</p>
                      <p className="text-sm text-[#6E6666]">{formatRoleLabel(user?.role)}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-[#6E6666]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[17rem] rounded-2xl border-[#EADCCF] bg-[#FFFDF9] p-2 text-[#2F2A2A] shadow-[0_22px_60px_-36px_rgba(47,42,42,0.4)]"
                >
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="font-medium text-[#2F2A2A]">{user?.name || user?.email}</p>
                    <p className="text-xs font-normal text-[#6E6666]">{formatRoleLabel(user?.role)}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#EADCCF]" />
                  <DropdownMenuItem
                    className="rounded-xl px-3 py-2.5 text-[#2F2A2A] focus:bg-[#FFF7F8] focus:text-[#2F2A2A]"
                    onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Lihat Website
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl px-3 py-2.5 text-[#A05366] focus:bg-[#FDF1F4] focus:text-[#A05366]"
                    onClick={() => void handleAdminLogout()}
                    disabled={actionLoading === 'admin-logout'}
                  >
                    <LogOut className="h-4 w-4" />
                    {actionLoading === 'admin-logout' ? 'Keluar...' : 'Keluar'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {dashboardError && (
            <Alert className="bg-[#F4D9DE]/30 border-[#E8BFCB]/50">
              <AlertDescription className="text-[#2F2A2A]">{dashboardError}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto bg-[#FFFDF9] border border-[#EADCCF] p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#E8BFCB]/30">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Ringkasan
              </TabsTrigger>
              <TabsTrigger value="photos" className="data-[state=active]:bg-[#E8BFCB]/30">
                <Camera className="w-4 h-4 mr-2" />
                Foto
              </TabsTrigger>
              <TabsTrigger value="music" className="data-[state=active]:bg-[#E8BFCB]/30">
                <Music className="w-4 h-4 mr-2" />
                Musik
              </TabsTrigger>
              <TabsTrigger value="comments" className="data-[state=active]:bg-[#E8BFCB]/30">
                <MessageCircle className="w-4 h-4 mr-2" />
                Komentar
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-[#E8BFCB]/30">
                <Users className="w-4 h-4 mr-2" />
                Pengguna
              </TabsTrigger>
              {isSuperAdmin() && (
                <TabsTrigger value="content" className="data-[state=active]:bg-[#E8BFCB]/30">
                  <FileText className="w-4 h-4 mr-2" />
                  Konten
                </TabsTrigger>
              )}
              <TabsTrigger value="settings" className="data-[state=active]:bg-[#E8BFCB]/30">
                <UserCog className="w-4 h-4 mr-2" />
                Pengaturan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Pengunjung', value: totalVisitors, color: 'bg-[#E8BFCB]/30' },
                  { label: 'Super Admin', value: totalAdmins, color: 'bg-[#DCEAF6]' },
                  { label: 'Foto', value: photos.length, color: 'bg-[#E2EEDB]' },
                  { label: 'Komentar Aktif', value: visibleComments, color: 'bg-[#F6EFCF]' },
                ].map((item) => (
                  <Card key={item.label} className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-[#6E6666]">{item.label}</p>
                      <p className="mt-2 text-3xl font-serif text-[#2F2A2A]">{item.value}</p>
                      <div className={`mt-4 h-2 rounded-full ${item.color}`} />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2F2A2A]">{contentForm.admin_activity_title}</CardTitle>
                  <CardDescription className="text-[#6E6666]">
                    {contentForm.admin_activity_description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {auditLogs.length === 0 && (
                    <p className="text-sm text-[#6E6666]">Belum ada aktivitas admin yang tercatat.</p>
                  )}
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-[#EADCCF] bg-[#F7F4EF] p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-[#2F2A2A]">{formatAuditAction(log.action)}</p>
                          <p className="text-sm text-[#6E6666]">
                            {log.admin?.name || log.admin?.email || 'Sistem'} · {formatAuditTargetType(log.targetType)}
                          </p>
                        </div>
                        <p className="text-xs text-[#6E6666]">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos" className="space-y-6">
              <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2F2A2A]">{contentForm.admin_photos_title}</CardTitle>
                  <CardDescription className="text-[#6E6666]">
                    {contentForm.admin_photos_description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePhoto} className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-3">
                      <UploadDropzone
                        id="new-photo-file"
                        label="File Foto"
                        hint="Klik atau drop file JPG, PNG, WEBP, atau GIF sampai 5MB."
                        recommendedSize={galleryRecommendedSize}
                        file={newPhotoFile}
                        progress={newPhotoUploadProgress}
                        isUploading={actionLoading === 'create-photo' && !!newPhotoFile}
                        dragActive={newPhotoDragActive}
                        onDragActiveChange={setNewPhotoDragActive}
                        onFileSelect={setNewPhotoFile}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="new-photo-url">URL Gambar</Label>
                      <Input
                        id="new-photo-url"
                        value={newPhoto.imageUrl}
                        onChange={(e) => setNewPhoto((current) => ({ ...current, imageUrl: e.target.value }))}
                        placeholder="https://... (opsional jika upload file)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-photo-caption">Caption</Label>
                      <Input
                        id="new-photo-caption"
                        value={newPhoto.caption}
                        onChange={(e) => setNewPhoto((current) => ({ ...current, caption: e.target.value }))}
                        placeholder="Caption singkat"
                      />
                    </div>
                    <label className="flex items-center gap-3 text-sm text-[#2F2A2A]">
                      <input
                        type="checkbox"
                        checked={newPhoto.featured}
                        onChange={(e) => setNewPhoto((current) => ({ ...current, featured: e.target.checked }))}
                      />
                      Jadikan unggulan
                    </label>
                    <div className="md:col-span-3">
                      <Button
                        type="submit"
                        className="bg-[#E8BFCB] hover:bg-[#E8BFCB]/90 text-[#2F2A2A]"
                        disabled={actionLoading === 'create-photo'}
                      >
                        {actionLoading === 'create-photo' ? 'Menyimpan...' : 'Tambah Foto'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 rounded-2xl border border-[#EADCCF] bg-[#FFFDF9] p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <ArrowUpDown className="mt-0.5 h-5 w-5 text-[#2F2A2A]" />
                  <div>
                    <p className="font-medium text-[#2F2A2A]">Urutan Foto</p>
                    <p className="text-sm text-[#6E6666]">
                      Drag card foto untuk mengubah urutan. Perubahan lokal tidak disimpan sampai Anda klik tombol simpan.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/90"
                  disabled={!photoOrderDirty || actionLoading === 'photo-order'}
                  onClick={() => void handleSavePhotoOrder()}
                >
                  {actionLoading === 'photo-order' ? 'Menyimpan...' : 'Simpan Urutan Foto'}
                </Button>
              </div>

              {photoOrderMessage && (
                <Alert className="bg-[#F7F4EF] border-[#EADCCF]">
                  <AlertDescription className="text-[#2F2A2A]">{photoOrderMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {photos.length === 0 && (
                  <Card className="border-dashed border-[#EADCCF] bg-[#FFFDF9] shadow-sm">
                    <CardContent className="p-6 text-sm leading-7 text-[#6E6666]">
                      Belum ada foto di dashboard. Tambahkan foto pertama untuk mulai menyusun galeri.
                    </CardContent>
                  </Card>
                )}

                {photos.map((photo) => {
                  const isExpanded = expandedPhotoId === photo.id
                  const hasReplacementFile = Boolean(photoFiles[photo.id])

                  return (
                    <Collapsible
                      key={photo.id}
                      open={isExpanded}
                      onOpenChange={(open) => setExpandedPhotoId(open ? photo.id : null)}
                    >
                      <Card
                        draggable
                        onDragStart={() => handlePhotoDragStart(photo.id)}
                        onDragEnd={() => {
                          setDraggedPhotoId(null)
                          setDragOverPhotoId(null)
                        }}
                        onDragOver={(event) => {
                          event.preventDefault()
                          setDragOverPhotoId(photo.id)
                        }}
                        onDrop={() => handlePhotoDrop(photo.id)}
                        className={`border-[#EADCCF] bg-[#FFFDF9] shadow-sm transition ${
                          draggedPhotoId === photo.id
                            ? 'opacity-70 ring-2 ring-[#E8BFCB]'
                            : dragOverPhotoId === photo.id
                              ? 'ring-2 ring-[#EADCCF]'
                              : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="flex min-w-0 flex-1 items-center gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F4EF] text-[#2F2A2A]">
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.1rem] bg-[#EADCCF] sm:h-24 sm:w-24">
                                <img
                                  src={photo.imageUrl}
                                  alt={photo.caption || 'Foto'}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-medium text-[#2F2A2A]">
                                  {photo.caption || `Foto #${photo.order + 1}`}
                                </p>
                                <p className="mt-1 truncate text-sm text-[#6E6666]">{photo.imageUrl}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge className="bg-[#F7F4EF] text-[#2F2A2A]">Urutan #{photo.order + 1}</Badge>
                                  {photo.featured && (
                                    <Badge className="bg-[#E8BFCB] text-[#2F2A2A]">Unggulan</Badge>
                                  )}
                                  {hasReplacementFile && (
                                    <Badge className="bg-[#DCEAF6] text-[#2F2A2A]">File baru siap</Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
                              <div className="rounded-xl bg-[#F7F4EF] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#8B7676]">
                                Geser untuk ubah urutan
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full border-[#F4D9DE] bg-[#FFFDF9] px-5 text-red-600 hover:bg-[#FDF1F4]"
                                onClick={() => void handlePhotoDelete(photo.id)}
                                disabled={actionLoading === `photo-delete-${photo.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                                {actionLoading === `photo-delete-${photo.id}` ? 'Menghapus...' : 'Hapus'}
                              </Button>
                              <CollapsibleTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-full border-[#EADCCF] bg-[#FFFDF9] px-5 text-[#2F2A2A] hover:bg-[#FFF7F8]"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" />
                                      Tutup detail
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      Buka detail
                                    </>
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          <CollapsibleContent className="pt-4">
                            <div className="grid gap-4 border-t border-[#EADCCF] pt-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2 md:col-span-2">
                                    <Label>URL Gambar</Label>
                                    <Input
                                      value={photo.imageUrl}
                                      onChange={(e) => handlePhotoFieldChange(photo.id, 'imageUrl', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Caption</Label>
                                    <Input
                                      value={photo.caption || ''}
                                      onChange={(e) => handlePhotoFieldChange(photo.id, 'caption', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Urutan</Label>
                                    <Input
                                      type="number"
                                      value={photo.order}
                                      onChange={(e) => handlePhotoFieldChange(photo.id, 'order', Number(e.target.value))}
                                    />
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-[#EADCCF] bg-[#F7F4EF] px-4 py-3">
                                  <label className="flex items-center gap-3 text-sm text-[#2F2A2A]">
                                    <input
                                      type="checkbox"
                                      checked={photo.featured}
                                      onChange={(e) => handlePhotoFieldChange(photo.id, 'featured', e.target.checked)}
                                    />
                                    Jadikan foto unggulan
                                  </label>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Button
                                    className="bg-[#E8BFCB] text-[#2F2A2A] hover:bg-[#E8BFCB]/90"
                                    onClick={() => void handlePhotoSave(photo)}
                                    disabled={actionLoading === `photo-${photo.id}`}
                                  >
                                    Simpan Perubahan
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-[#F4D9DE] text-red-600 hover:bg-[#F4D9DE]/30"
                                    onClick={() => void handlePhotoDelete(photo.id)}
                                    disabled={actionLoading === `photo-delete-${photo.id}`}
                                  >
                                    Hapus Foto
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="overflow-hidden rounded-[1.4rem] border border-[#EADCCF] bg-[#FFFDF9] p-3">
                                  <div className="overflow-hidden rounded-[1rem] bg-[#EADCCF]">
                                    <img
                                      src={photo.imageUrl}
                                      alt={photo.caption || 'Foto'}
                                      className="h-auto w-full"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                </div>
                                <UploadDropzone
                                  id={`photo-file-${photo.id}`}
                                  label="Ganti File"
                                  hint="Drop file baru kalau ingin mengganti gambar tanpa mengubah caption."
                                  recommendedSize={galleryRecommendedSize}
                                  file={photoFiles[photo.id] || null}
                                  progress={photoUploadProgress[photo.id] || 0}
                                  isUploading={actionLoading === `photo-${photo.id}` && !!photoFiles[photo.id]}
                                  dragActive={photoDragActive[photo.id] || false}
                                  onDragActiveChange={(active) =>
                                    setPhotoDragActive((current) => ({
                                      ...current,
                                      [photo.id]: active,
                                    }))
                                  }
                                  onFileSelect={(file) =>
                                    setPhotoFiles((current) => ({
                                      ...current,
                                      [photo.id]: file,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </CollapsibleContent>
                        </CardContent>
                      </Card>
                    </Collapsible>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="music" className="space-y-6">
              <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2F2A2A]">Koleksi Musik</CardTitle>
                  <CardDescription className="text-[#6E6666]">
                    Tempel link Spotify biasa atau link embed. Sistem akan otomatis mengubahnya ke format embed yang benar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateMusic} className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-music-title">Judul Musik</Label>
                      <Input
                        id="new-music-title"
                        value={newMusic.title}
                        onChange={(e) => setNewMusic((current) => ({ ...current, title: e.target.value }))}
                        placeholder="Misalnya: Sore yang tenang"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-music-url">URL Spotify</Label>
                      <Input
                        id="new-music-url"
                        value={newMusic.spotifyUrl}
                        onChange={(e) => setNewMusic((current) => ({ ...current, spotifyUrl: e.target.value }))}
                        placeholder="https://open.spotify.com/playlist/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-music-type">Tipe</Label>
                      <select
                        id="new-music-type"
                        value={newMusic.type}
                        onChange={(e) =>
                          setNewMusic((current) => ({
                            ...current,
                            type: e.target.value as DashboardMusic['type'],
                          }))
                        }
                        className="flex h-10 w-full rounded-md border border-[#EADCCF] bg-[#FFFDF9] px-3 py-2 text-sm text-[#2F2A2A] shadow-xs outline-none"
                      >
                        <option value="playlist">Playlist</option>
                        <option value="track">Lagu</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-music-order">Urutan</Label>
                      <Input
                        id="new-music-order"
                        type="number"
                        min={0}
                        value={newMusic.order}
                        onChange={(e) => setNewMusic((current) => ({ ...current, order: e.target.value }))}
                        placeholder="Kosongkan agar otomatis"
                      />
                    </div>
                    <label className="md:col-span-2 flex items-center gap-3 text-sm text-[#2F2A2A]">
                      <input
                        type="checkbox"
                        checked={newMusic.featured}
                        onChange={(e) => setNewMusic((current) => ({ ...current, featured: e.target.checked }))}
                      />
                      Jadikan unggulan utama di beranda dan halaman musik
                    </label>
                    <div className="md:col-span-2 rounded-2xl border border-[#EADCCF] bg-[#F7F4EF] px-4 py-3 text-sm leading-7 text-[#6E6666]">
                      Link yang didukung: track atau playlist Spotify. Anda bisa menempel link share biasa, link
                      open.spotify.com, atau link embed.
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="submit"
                        className="bg-[#E8BFCB] hover:bg-[#E8BFCB]/90 text-[#2F2A2A]"
                        disabled={actionLoading === 'create-music'}
                      >
                        {actionLoading === 'create-music' ? 'Menyimpan...' : 'Tambah Musik'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {musicItems.length === 0 ? (
                <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                  <CardContent className="p-6 text-sm leading-7 text-[#6E6666]">
                    Belum ada musik tersimpan. Tambahkan playlist atau lagu pertama untuk mengisi halaman musik.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {musicItems.map((item) => {
                    const previewUrl = toSpotifyEmbedUrl(item.spotifyUrl, item.type)

                    return (
                      <Card key={item.id} className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                        <CardContent className="space-y-4 p-4">
                          <div className="overflow-hidden rounded-[1.4rem] bg-[#2F2A2A]">
                            {previewUrl.startsWith('https://open.spotify.com/embed/') ? (
                              <iframe
                                src={previewUrl}
                                className="aspect-video w-full"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-[#FFFDF9]">
                                Tempel URL Spotify yang valid untuk melihat preview.
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Judul Musik</Label>
                            <Input
                              value={item.title}
                              onChange={(e) => handleMusicFieldChange(item.id, 'title', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>URL Spotify</Label>
                            <Input
                              value={item.spotifyUrl}
                              onChange={(e) => handleMusicFieldChange(item.id, 'spotifyUrl', e.target.value)}
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Tipe</Label>
                              <select
                                value={item.type}
                                onChange={(e) =>
                                  handleMusicFieldChange(item.id, 'type', e.target.value as DashboardMusic['type'])
                                }
                                className="flex h-10 w-full rounded-md border border-[#EADCCF] bg-[#FFFDF9] px-3 py-2 text-sm text-[#2F2A2A] shadow-xs outline-none"
                              >
                                <option value="playlist">Playlist</option>
                                <option value="track">Lagu</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label>Urutan</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.order}
                                onChange={(e) => handleMusicFieldChange(item.id, 'order', Number(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F4EF] px-3 py-3 text-sm text-[#2F2A2A]">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.featured}
                                onChange={(e) => handleMusicFieldChange(item.id, 'featured', e.target.checked)}
                              />
                              Unggulan
                            </label>
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs uppercase tracking-[0.18em] text-[#6E8091]"
                            >
                              buka embed
                            </a>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-[#E8BFCB] hover:bg-[#E8BFCB]/90 text-[#2F2A2A]"
                              onClick={() => void handleMusicSave(item)}
                              disabled={actionLoading === `music-${item.id}`}
                            >
                              Simpan
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 border-[#F4D9DE] text-red-600 hover:bg-[#F4D9DE]/30"
                              onClick={() => void handleMusicDelete(item.id)}
                              disabled={actionLoading === `music-delete-${item.id}`}
                            >
                              Hapus
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id} className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className={`rounded-xl p-4 ${noteColors[comment.noteColor]}`}>
                        <p className="text-[#2F2A2A]">{comment.content}</p>
                        <p className="mt-2 text-sm text-[#6E6666]">
                          {comment.userName} · {comment.createdAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={comment.hidden ? 'bg-[#F4D9DE] text-[#2F2A2A]' : 'bg-[#E2EEDB] text-[#2F2A2A]'}>
                          {comment.hidden ? 'Tersembunyi' : 'Tampil'}
                        </Badge>
                        <Button
                          variant="outline"
                          className="border-[#EADCCF]"
                          onClick={() => void handleCommentHiddenToggle(comment)}
                          disabled={actionLoading === `comment-${comment.id}`}
                        >
                          {comment.hidden ? 'Tampilkan' : 'Sembunyikan'}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-[#F4D9DE] text-red-600 hover:bg-[#F4D9DE]/30"
                          onClick={() => void handleCommentDelete(comment.id)}
                          disabled={actionLoading === `comment-delete-${comment.id}`}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2F2A2A]">Yang baru bergabung</CardTitle>
                  <CardDescription className="text-[#6E6666]">
                    Tempat meninjau pengguna yang baru mendaftar sebelum diterima, ditolak, atau dihapus.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentJoinedUsers.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#EADCCF] bg-[#F7F4EF] p-4 text-sm text-[#6E6666]">
                      Belum ada pengguna baru yang bisa ditinjau.
                    </div>
                  )}

                  {recentJoinedUsers.length > 0 && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {recentJoinedUsers.map((item) => (
                        <div
                          key={`recent-${item.id}`}
                          className="rounded-[1.7rem] border border-[#EADCCF] bg-[#F7F4EF] p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-[#2F2A2A]">{item.name || 'Pengguna tanpa nama'}</p>
                              <p className="mt-1 text-sm text-[#6E6666]">{item.email}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#8B7676]">
                                Bergabung {item.createdAt ? formatDateTime(item.createdAt) : '-'}
                              </p>
                            </div>
                            <Badge className={approvalBadgeClass(item.approvalStatus)}>
                              {formatApprovalLabel(item.approvalStatus)}
                            </Badge>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge className={item.authProvider === 'google' ? 'bg-[#DCEAF6] text-[#2F2A2A]' : 'bg-[#EADCCF] text-[#2F2A2A]'}>
                              {item.authProvider === 'google' ? 'Google' : 'Password'}
                            </Badge>
                            <Badge className={item.isActive ? 'bg-[#E2EEDB] text-[#2F2A2A]' : 'bg-[#F4D9DE] text-[#2F2A2A]'}>
                              {item.isActive ? 'Aktif' : 'Ditangguhkan'}
                            </Badge>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {renderUserManagementActions(item)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {users.map((item) => {
                return (
                  <Card key={item.id} className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                    <CardContent className="p-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={item.avatarUrl || undefined} alt={item.name || item.email} />
                          <AvatarFallback className="bg-[#E8BFCB]/30 text-[#2F2A2A]">
                            {item.name?.charAt(0) || item.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-[#2F2A2A]">{item.name || 'Pengguna tanpa nama'}</p>
                          <p className="text-sm text-[#6E6666]">{item.email}</p>
                          <p className="text-xs text-[#6E6666]">
                            {item.authProvider === 'google' ? 'Akun Google' : 'Akun dengan password'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={item.role === 'USER' ? 'bg-[#EADCCF] text-[#2F2A2A]' : 'bg-[#E8BFCB] text-[#2F2A2A]'}>
                          {formatRoleLabel(item.role)}
                        </Badge>
                        <Badge className={approvalBadgeClass(item.approvalStatus)}>
                          {formatApprovalLabel(item.approvalStatus)}
                        </Badge>
                        <Badge className={item.isActive ? 'bg-[#E2EEDB] text-[#2F2A2A]' : 'bg-[#F4D9DE] text-[#2F2A2A]'}>
                          {item.isActive ? 'Aktif' : 'Ditangguhkan'}
                        </Badge>
                        {renderUserManagementActions(item)}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            {isSuperAdmin() && (
              <TabsContent value="content">
                <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle className="text-[#2F2A2A]">{contentForm.admin_content_title}</CardTitle>
                        <CardDescription className="text-[#6E6666]">
                          {contentForm.admin_content_description}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#EADCCF] bg-[#F7F4EF] px-4 py-3">
                        <Badge className={contentEditMode ? 'bg-[#E8BFCB] text-[#2F2A2A]' : 'bg-[#EADCCF] text-[#2F2A2A]'}>
                          {contentEditMode ? 'Mode Edit Aktif' : 'Mode Edit Nonaktif'}
                        </Badge>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={contentEditMode}
                            onCheckedChange={setContentEditMode}
                            aria-label="Aktifkan mode edit konten"
                            className="data-[state=checked]:bg-[#2F2A2A] data-[state=unchecked]:bg-[#D9C7C0]"
                          />
                          <p className="text-sm text-[#6E6666]">
                            Aktifkan untuk mengubah teks dan foto konten statis. Galeri tetap lewat upload foto.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleContentSave} className="space-y-6">
                      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
                        <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
                          <div className="rounded-2xl border border-[#EADCCF] bg-[#F7F4EF] p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#8B7676]">Pilih halaman</p>
                            <p className="mt-2 text-sm leading-6 text-[#6E6666]">
                              Editor konten sekarang dipisah per halaman supaya tidak memanjang ke bawah.
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                            {contentEditorPages.map((page) => (
                              <button
                                key={page.id}
                                type="button"
                                onClick={() => setActiveContentPage(page.id)}
                                className={`rounded-2xl border px-4 py-4 text-left transition ${
                                  activeContentPage === page.id
                                    ? 'border-[#2F2A2A] bg-[#2F2A2A] text-[#FFFDF9] shadow-sm'
                                    : 'border-[#EADCCF] bg-[#FFFDF9] text-[#2F2A2A] hover:bg-[#FFF7F8]'
                                }`}
                              >
                                <p className="text-sm font-medium">{page.title}</p>
                                <p className={`mt-2 text-xs leading-5 ${
                                  activeContentPage === page.id ? 'text-[#F7F4EF]' : 'text-[#6E6666]'
                                }`}>
                                  {page.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        </aside>

                        <div className="space-y-6">
                          <div className="rounded-2xl border border-[#EADCCF] bg-[#F7F4EF] p-5">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#8B7676]">Halaman aktif</p>
                            <h3 className="mt-3 font-serif text-2xl text-[#2F2A2A]">{selectedContentPage.title}</h3>
                            <p className="mt-2 text-sm leading-7 text-[#6E6666]">
                              {selectedContentPage.description}
                            </p>
                          </div>

                          <div className="flex flex-col gap-4 rounded-2xl border border-[#EADCCF] bg-[#FFF7F8] p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-[#8B7676]">Status perubahan</p>
                              <p className="mt-2 text-sm text-[#2F2A2A]">
                                {contentDirty
                                  ? 'Ada perubahan yang belum disimpan.'
                                  : 'Perubahan untuk editor konten sudah tersimpan.'}
                              </p>
                            </div>
                            <Button
                              type="submit"
                              className="bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/90"
                              disabled={contentBusy || !contentEditMode || !contentDirty}
                            >
                              {actionLoading === 'content' ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                          </div>

                          {selectedContentPage.sections.map((section) => (
                            <div key={`${selectedContentPage.id}-${section.title}`} className="rounded-2xl border border-[#EADCCF] bg-[#F7F4EF] p-5">
                              <div className="mb-4">
                                <h3 className="font-serif text-xl text-[#2F2A2A]">{section.title}</h3>
                                <p className="text-sm text-[#6E6666]">{section.description}</p>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                {section.fields.map((field) => (
                                  <div
                                    key={field.key}
                                    className={field.multiline || field.kind === 'image' ? 'space-y-2 md:col-span-2' : 'space-y-2'}
                                  >
                                    <Label htmlFor={field.key}>{field.label}</Label>
                                    {field.kind === 'image' ? (
                                      <div className="space-y-4 rounded-2xl border border-[#EADCCF] bg-[#FFFDF9] p-4">
                                        <ContentImagePreview
                                          fieldKey={field.key}
                                          label={field.label}
                                          contentForm={contentForm}
                                        />

                                        {field.recommendedSize && (
                                          <div className="rounded-2xl border border-dashed border-[#EADCCF] bg-[#FFF7F8] px-4 py-3 text-xs text-[#8B7676]">
                                            Ukuran rekomendasi: {field.recommendedSize}
                                          </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-3">
                                          <input
                                            id={`content-image-upload-${field.key}`}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            className="sr-only"
                                            disabled={!contentEditMode || contentBusy}
                                            onChange={(event) => {
                                              const file = event.target.files?.[0] || null
                                              event.target.value = ''
                                              void handleContentImageUpload(field.key, file)
                                            }}
                                          />
                                          <label
                                            htmlFor={`content-image-upload-${field.key}`}
                                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                                            contentEditMode
                                              ? 'cursor-pointer bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/92'
                                              : 'cursor-not-allowed bg-[#EADCCF] text-[#6E6666]'
                                            }`}
                                          >
                                            <Camera className="h-4 w-4" />
                                            Ganti gambar
                                          </label>
                                          {actionLoading === `content-image-${field.key}` && (
                                            <span className="text-xs uppercase tracking-[0.18em] text-[#8B7676]">
                                              Mengunggah... {contentImageUploadProgress[field.key] || 0}%
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-xs text-[#8B7676]">
                                          Format yang didukung: JPG, PNG, WEBP, GIF. Maksimal 5MB.
                                        </p>

                                        {contentImageStatus[field.key] && (
                                          <div className={`rounded-2xl border px-4 py-3 text-sm ${
                                            contentImageStatus[field.key]?.includes('berhasil')
                                              ? 'border-[#DCE5D7] bg-[#F6FBF4] text-[#2F2A2A]'
                                              : 'border-[#F4D9DE] bg-[#FFF3F4] text-[#2F2A2A]'
                                          }`}>
                                            {contentImageStatus[field.key]}
                                          </div>
                                        )}

                                        <Input
                                          id={field.key}
                                          value={contentForm[field.key]}
                                          onChange={(event) => handleContentFieldChange(field.key, event.target.value)}
                                          className="border-[#EADCCF] bg-[#FFFDF9]"
                                          disabled={!contentEditMode || contentBusy}
                                        />
                                      </div>
                                    ) : field.multiline ? (
                                      <Textarea
                                        id={field.key}
                                        rows={field.rows || 3}
                                        value={contentForm[field.key]}
                                        onChange={(event) => handleContentFieldChange(field.key, event.target.value)}
                                        className="resize-none border-[#EADCCF] bg-[#FFFDF9]"
                                        disabled={!contentEditMode || contentBusy}
                                      />
                                    ) : (
                                      <Input
                                        id={field.key}
                                        value={contentForm[field.key]}
                                        onChange={(event) => handleContentFieldChange(field.key, event.target.value)}
                                        className="border-[#EADCCF] bg-[#FFFDF9]"
                                        disabled={!contentEditMode || contentBusy}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {contentMessage && (
                        <Alert className="bg-[#F7F4EF] border-[#EADCCF]">
                          <AlertDescription className="text-[#2F2A2A]">{contentMessage}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        className="bg-[#2F2A2A] hover:bg-[#2F2A2A]/90 text-[#FFFDF9]"
                        disabled={contentBusy || !contentEditMode || !contentDirty}
                      >
                        {actionLoading === 'content' ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="settings" className="grid gap-6 xl:grid-cols-2">
              <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2F2A2A]">Profil Admin</CardTitle>
                  <CardDescription className="text-[#6E6666]">
                    Ganti nama, email, dan foto profil admin. Avatar bisa diunggah langsung ke penyimpanan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profileForm.avatarUrl || undefined} alt={profileForm.name || profileForm.email} />
                        <AvatarFallback className="bg-[#E8BFCB]/30 text-[#2F2A2A]">
                          {profileForm.name?.charAt(0) || profileForm.email?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 flex-1">
                        <UploadDropzone
                          id="profile-avatar-file"
                          label="Unggah Foto Profil"
                          hint="Drop avatar baru atau klik area ini untuk memilih file."
                          recommendedSize="800 x 800 px, persegi"
                          file={avatarFile}
                          progress={avatarUploadProgress}
                          isUploading={actionLoading === 'profile' && !!avatarFile}
                          dragActive={avatarDragActive}
                          onDragActiveChange={setAvatarDragActive}
                          onFileSelect={setAvatarFile}
                        />
                        <Label htmlFor="profile-avatar-url">Foto Profil (URL Gambar)</Label>
                        <Input
                          id="profile-avatar-url"
                          value={profileForm.avatarUrl}
                          onChange={(e) => setProfileForm((current) => ({ ...current, avatarUrl: e.target.value }))}
                          placeholder="https://... (opsional jika upload file)"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Nama</Label>
                      <Input
                        id="profile-name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((current) => ({ ...current, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((current) => ({ ...current, email: e.target.value }))}
                        disabled={user?.authProvider === 'google'}
                      />
                      {user?.authProvider === 'google' && (
                        <p className="text-xs text-[#6E6666]">
                          Email akun Google dikunci agar tetap sinkron dengan provider login.
                        </p>
                      )}
                    </div>

                    {profileMessage && (
                      <Alert className="bg-[#F7F4EF] border-[#EADCCF]">
                        <AlertDescription className="text-[#2F2A2A]">{profileMessage}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="bg-[#E8BFCB] hover:bg-[#E8BFCB]/90 text-[#2F2A2A]"
                      disabled={actionLoading === 'profile'}
                    >
                      {actionLoading === 'profile' ? 'Menyimpan...' : 'Simpan Profil'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-[#FFFDF9] border-[#EADCCF] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#2F2A2A]">Keamanan</CardTitle>
                  <CardDescription className="text-[#6E6666]">
                    Ganti password admin dengan verifikasi password saat ini.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user?.authProvider === 'google' ? (
                    <Alert className="bg-[#F7F4EF] border-[#EADCCF]">
                      <AlertDescription className="text-[#2F2A2A]">
                        Akun admin ini masuk lewat Google, jadi tidak memiliki password lokal.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <form onSubmit={handlePasswordSave} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Password Saat Ini</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((current) => ({ ...current, currentPassword: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Password Baru</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">Konfirmasi Password Baru</Label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                        />
                      </div>

                      {passwordMessage && (
                        <Alert className="bg-[#F7F4EF] border-[#EADCCF]">
                          <AlertDescription className="text-[#2F2A2A]">{passwordMessage}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        className="bg-[#2F2A2A] hover:bg-[#2F2A2A]/90 text-[#FFFDF9]"
                        disabled={actionLoading === 'password'}
                      >
                        {actionLoading === 'password' ? 'Menyimpan...' : 'Perbarui Password'}
                      </Button>
                    </form>
                  )}

                  <div className="mt-6 rounded-2xl bg-[#F7F4EF] p-4 text-sm text-[#6E6666]">
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 h-4 w-4 text-[#2F2A2A]" />
                      <p>
                        Sesi admin sekarang diverifikasi di server. Peran di sisi klien tidak lagi cukup
                        untuk memanggil API sensitif.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
