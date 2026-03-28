import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseServerClient,
  mapCommentRowToResponse,
  NoteColor,
} from '@/lib/supabase'
import { isAdminRole, requireAuthenticatedUser } from '@/lib/server-auth'

type CommentRow = {
  id: string
  content: string
  note_color: NoteColor
  hidden: boolean
  user_id: string
  created_at: string
  updated_at: string
}

type UserRow = {
  id: string
  email: string
  name: string | null
}

// GET all visible comments
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit'))
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.trunc(requestedLimit), 24)
      : null

    if ('response' in session) {
      return session.response
    }

    const supabase = getSupabaseServerClient()
    let query = supabase
      .from('comments')
      .select('id, content, note_color, hidden, user_id, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (!isAdminRole(session.user.role)) {
      query = query.eq('hidden', false)
    }

    if (limit !== null) {
      query = query.limit(limit)
    }

    const { data: comments, error: commentsError, count } = await query

    if (commentsError) {
      throw commentsError
    }

    const typedComments = (comments || []) as CommentRow[]
    const userIds = [...new Set(typedComments.map((comment) => comment.user_id))]
    let usersById = new Map<string, UserRow>()

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds)

      if (usersError) {
        throw usersError
      }

      usersById = new Map((users || []).map((user) => [user.id, user as UserRow]))
    }

    const formattedComments = typedComments.map((comment) => {
      const user = usersById.get(comment.user_id)

      return {
        id: comment.id,
        content: comment.content,
        noteColor: comment.note_color,
        hidden: comment.hidden,
        userId: comment.user_id,
        userName: user?.name || user?.email.split('@')[0] || 'Anonim',
        createdAt: formatTimeAgo(comment.created_at),
      }
    })

    return NextResponse.json({
      comments: formattedComments,
      totalCount: count ?? formattedComments.length,
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Gagal memuat komentar' },
      { status: 500 }
    )
  }
}

// POST create new comment
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)

    if ('response' in session) {
      return session.response
    }

    if (session.user.role === 'USER' && session.user.approval_status !== 'APPROVED') {
      return NextResponse.json(
        {
          error:
            session.user.approval_status === 'REJECTED'
              ? 'Akun kamu ditolak admin dan tidak bisa mengirim pesan.'
              : 'Akun kamu masih menunggu persetujuan admin sebelum bisa mengirim pesan.',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content, noteColor } = body
    const supabase = getSupabaseServerClient()

    // Validate input
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Isi komentar wajib diisi' },
        { status: 400 }
      )
    }

    if (content.length > 150) {
      return NextResponse.json(
        { error: 'Komentar maksimal 150 karakter' },
        { status: 400 }
      )
    }

    // Validate note color
    const validColors: NoteColor[] = ['CREAM', 'BLUE', 'BLUSH', 'SAGE']
    const color = validColors.includes(noteColor) ? noteColor as NoteColor : 'CREAM'

    const { data: comment, error: createCommentError } = await supabase
      .from('comments')
      .insert({
        content: content.trim(),
        note_color: color,
        user_id: session.user.id,
      })
      .select('id, content, note_color, hidden, user_id, created_at, updated_at')
      .single()

    if (createCommentError || !comment) {
      throw createCommentError || new Error('Gagal membuat komentar')
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', comment.user_id)
      .maybeSingle()

    if (userError) {
      throw userError
    }

    return NextResponse.json(
      {
        comment: {
          ...mapCommentRowToResponse(comment),
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
              }
            : null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Gagal membuat komentar' },
      { status: 500 }
    )
  }
}

// Helper function to format time ago
function formatTimeAgo(dateInput: string): string {
  const date = new Date(dateInput)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Baru saja'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`
  return date.toLocaleDateString('id-ID')
}
