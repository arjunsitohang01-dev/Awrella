import { createClient } from '@supabase/supabase-js'
import { type DatabaseUserRole, normalizeUserRole } from '@/lib/user-roles'
import { toSpotifyEmbedUrl } from '@/lib/spotify'

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const DEFAULT_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export type NoteColor = 'CREAM' | 'BLUE' | 'BLUSH' | 'SAGE'
export type AuthProvider = 'password' | 'google'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type UserRow = {
  id: string
  email: string
  name: string | null
  role: DatabaseUserRole
  is_active: boolean
  approval_status: ApprovalStatus
  created_at: string
  updated_at: string
  avatar_url?: string | null
  auth_provider?: AuthProvider
}

export const USER_SELECT_COLUMNS =
  'id, email, name, role, is_active, approval_status, avatar_url, auth_provider, created_at, updated_at'

export function getSupabaseServerClient() {
  if (!DEFAULT_SUPABASE_URL) {
    throw new Error(
      'Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your environment.',
    )
  }

  if (!DEFAULT_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Server API routes require this key in production-safe mode.',
    )
  }

  return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getSupabaseAnonServerClient() {
  if (!DEFAULT_SUPABASE_URL) {
    throw new Error(
      'Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your environment.',
    )
  }

  if (!DEFAULT_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) for auth token verification.',
    )
  }

  return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function mapUserRowToResponse(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: normalizeUserRole(row.role),
    isActive: row.is_active,
    approvalStatus: row.approval_status,
    avatarUrl: row.avatar_url ?? null,
    authProvider: row.auth_provider ?? 'password',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapPhotoRowToResponse(row: {
  id: string
  image_url: string
  caption: string | null
  order: number
  featured: boolean
  user_id: string
  created_at: string
  updated_at: string
}) {
  return {
    id: row.id,
    imageUrl: row.image_url,
    caption: row.caption,
    order: row.order,
    featured: row.featured,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapMusicRowToResponse(row: {
  id: string
  title: string
  spotify_url: string
  type: string
  featured: boolean
  order: number
  created_at: string
  updated_at: string
}) {
  return {
    id: row.id,
    title: row.title,
    spotifyUrl: toSpotifyEmbedUrl(row.spotify_url, row.type),
    type: row.type,
    featured: row.featured,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapCommentRowToResponse(row: {
  id: string
  content: string
  note_color: NoteColor
  hidden: boolean
  user_id: string
  created_at: string
  updated_at: string
}) {
  return {
    id: row.id,
    content: row.content,
    noteColor: row.note_color,
    hidden: row.hidden,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
