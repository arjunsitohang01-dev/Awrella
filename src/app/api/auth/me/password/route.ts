import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient } from '@/lib/supabase'
import { isAdminRole, requireAuthenticatedUser } from '@/lib/server-auth'

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)

    if ('response' in session) {
      return session.response
    }

    if (session.user.auth_provider === 'google') {
      return NextResponse.json(
        { error: 'Akun Google tidak memiliki password lokal.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password saat ini dan password baru wajib diisi' },
        { status: 400 }
      )
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, password')
      .eq('id', session.user.id)
      .maybeSingle()

    if (userError) {
      throw userError
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    const passwordMatches = await bcrypt.compare(String(currentPassword), user.password)
    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Password saat ini tidak sesuai' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', session.user.id)

    if (updateError) {
      throw updateError
    }

    if (isAdminRole(session.user.role)) {
      await createAdminAuditLog({
        adminId: session.user.id,
        action: 'PASSWORD_UPDATED',
        targetType: 'user',
        targetId: session.user.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui password' },
      { status: 500 }
    )
  }
}
