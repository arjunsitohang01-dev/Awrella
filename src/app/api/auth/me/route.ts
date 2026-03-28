import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient, mapUserRowToResponse, USER_SELECT_COLUMNS, UserRow } from '@/lib/supabase'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { isAdminRole, requireAuthenticatedUser } from '@/lib/server-auth'
import { AVATAR_BUCKET, deleteStorageObjectByPublicUrl } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)

    if ('response' in session) {
      return session.response
    }

    return NextResponse.json({ user: mapUserRowToResponse(session.user) })
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Gagal memuat pengguna saat ini' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)

    if ('response' in session) {
      return session.response
    }

    const body = await request.json()
    const { name, email, avatarUrl } = body
    const updateData: Record<string, unknown> = {}
    const previousAvatarUrl = session.user.avatar_url ?? null

    if (name !== undefined) {
      updateData.name = String(name).trim() || null
    }

    if (avatarUrl !== undefined) {
      updateData.avatar_url = String(avatarUrl).trim() || null
    }

    if (email !== undefined) {
      if (session.user.auth_provider === 'google') {
        return NextResponse.json(
          { error: 'Email akun Google tidak bisa diubah dari dashboard ini.' },
          { status: 400 }
        )
      }

      const normalizedEmail = String(email).toLowerCase().trim()
      if (!normalizedEmail) {
        return NextResponse.json(
          { error: 'Email wajib diisi' },
          { status: 400 }
        )
      }

      const supabase = getSupabaseServerClient()
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .neq('id', session.user.id)
        .maybeSingle()

      if (existingUserError) {
        throw existingUserError
      }

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 400 }
        )
      }

      updateData.email = normalizedEmail
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data profil valid yang dikirim' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', session.user.id)
      .select(USER_SELECT_COLUMNS)
      .single()

    if (error || !user) {
      throw error || new Error('Gagal memperbarui profil')
    }

    if (
      avatarUrl !== undefined &&
      previousAvatarUrl &&
      previousAvatarUrl !== (user as UserRow).avatar_url
    ) {
      try {
        await deleteStorageObjectByPublicUrl(previousAvatarUrl, AVATAR_BUCKET)
      } catch (storageError) {
        console.error('Failed to delete previous avatar:', storageError)
      }
    }

    if (isAdminRole(session.user.role)) {
      await createAdminAuditLog({
        adminId: session.user.id,
        action: 'PROFILE_UPDATED',
        targetType: 'user',
        targetId: session.user.id,
        metadata: {
          changedName: name !== undefined,
          changedEmail: email !== undefined,
          changedAvatar: avatarUrl !== undefined,
        },
      })
    }

    return NextResponse.json({ user: mapUserRowToResponse(user as UserRow) })
  } catch (error) {
    console.error('Error updating current user:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui profil' },
      { status: 500 }
    )
  }
}
