import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import {
  USER_SELECT_COLUMNS,
  getSupabaseAnonServerClient,
  getSupabaseServerClient,
  UserRow,
} from '@/lib/supabase'
import { createAuthenticatedResponse, isAdminRole } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json(
        { error: 'Access token tidak ditemukan' },
        { status: 400 }
      )
    }

    const supabaseAnon = getSupabaseAnonServerClient()
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(accessToken)

    if (authError || !authData.user?.email) {
      return NextResponse.json(
        { error: 'Sesi Google tidak valid' },
        { status: 401 }
      )
    }

    const providers = authData.user.app_metadata?.providers
    if (!Array.isArray(providers) || !providers.includes('google')) {
      return NextResponse.json(
        { error: 'Provider Google wajib digunakan' },
        { status: 403 }
      )
    }

    const normalizedEmail = authData.user.email.toLowerCase().trim()
    const displayName =
      authData.user.user_metadata?.full_name ||
      authData.user.user_metadata?.name ||
      null

    const supabase = getSupabaseServerClient()

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select(USER_SELECT_COLUMNS)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUserError) {
      throw existingUserError
    }

    if (existingUser) {
      if (!existingUser.is_active) {
        return NextResponse.json(
          { error: 'Akun sedang dinonaktifkan' },
          { status: 403 }
        )
      }

      if (existingUser.approval_status === 'REJECTED') {
        return NextResponse.json(
          { error: 'Akun ini ditolak admin dan tidak bisa digunakan.' },
          { status: 403 }
        )
      }

      if (isAdminRole(existingUser.role)) {
        return NextResponse.json(
          { error: 'Pendaftaran dengan Google hanya tersedia untuk akun pengunjung.' },
          { status: 403 }
        )
      }

      return createAuthenticatedResponse(existingUser as UserRow)
    }

    const placeholderPassword = await bcrypt.hash(crypto.randomUUID(), 10)

    const { data: user, error: createUserError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password: placeholderPassword,
        name: displayName,
        role: 'USER',
        is_active: true,
        approval_status: 'PENDING',
        auth_provider: 'google',
        avatar_url: authData.user.user_metadata?.avatar_url || null,
      })
      .select(USER_SELECT_COLUMNS)
      .single()

    if (createUserError || !user) {
      throw createUserError || new Error('Gagal membuat pengguna')
    }

    return createAuthenticatedResponse(user as UserRow, 201)
  } catch (error) {
    console.error('Google auth complete error:', error)
    return NextResponse.json(
      { error: 'Gagal menyelesaikan pendaftaran Google' },
      { status: 500 }
    )
  }
}
