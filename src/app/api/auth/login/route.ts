import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAuthenticatedResponse } from '@/lib/server-auth'
import { getSupabaseServerClient, USER_SELECT_COLUMNS, UserRow } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    const normalizedEmail = email?.toLowerCase().trim()

    // Validate input
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`${USER_SELECT_COLUMNS}, password`)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (userError) {
      throw userError
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Email atau password tidak valid' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Akun sedang dinonaktifkan' },
        { status: 403 }
      )
    }

    if (user.approval_status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Akun ini ditolak admin dan tidak bisa digunakan.' },
        { status: 403 }
      )
    }

    if (user.auth_provider === 'google') {
      return NextResponse.json(
        { error: 'Akun ini terdaftar lewat Google dan tidak punya password lokal.' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email atau password tidak valid' },
        { status: 401 }
      )
    }

    return createAuthenticatedResponse(user as UserRow, 200)
  } catch (error) {
    console.error('Login error:', error)

    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat login'

    const clientErrorMessage =
      message.includes('SUPABASE_SERVICE_ROLE_KEY')
        ? 'Kesalahan konfigurasi server: SUPABASE_SERVICE_ROLE_KEY belum diisi di environment.'
        : message

    return NextResponse.json(
      { error: clientErrorMessage },
      { status: 500 }
    )
  }
}
