import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient, mapCommentRowToResponse } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/server-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const { id } = await params
    const body = await request.json()
    const { hidden } = body

    if (typeof hidden !== 'boolean') {
      return NextResponse.json(
        { error: 'Nilai hidden harus berupa boolean' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    const { data: comment, error } = await supabase
      .from('comments')
      .update({ hidden })
      .eq('id', id)
      .select('id, content, note_color, hidden, user_id, created_at, updated_at')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!comment) {
      return NextResponse.json(
        { error: 'Komentar tidak ditemukan' },
        { status: 404 }
      )
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: hidden ? 'COMMENT_HIDDEN' : 'COMMENT_UNHIDDEN',
      targetType: 'comment',
      targetId: comment.id,
    })

    return NextResponse.json({ comment: mapCommentRowToResponse(comment) })
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui komentar' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const { id } = await params
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'COMMENT_DELETED',
      targetType: 'comment',
      targetId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus komentar' },
      { status: 500 }
    )
  }
}
