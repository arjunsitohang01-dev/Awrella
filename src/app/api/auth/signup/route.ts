import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAuthenticatedResponse } from '@/lib/server-auth'
import { getSupabaseServerClient, USER_SELECT_COLUMNS, UserRow } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, registerAsAdmin } = body
    const normalizedEmail = email?.toLowerCase().trim()
    const shouldRegisterAsAdmin = Boolean(registerAsAdmin)

    // Validate input
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()

    const role: 'USER' | 'SUPER_ADMIN' = shouldRegisterAsAdmin ? 'SUPER_ADMIN' : 'USER'
    const approvalStatus: 'PENDING' | 'APPROVED' = shouldRegisterAsAdmin ? 'APPROVED' : 'PENDING'

    // Check if user already exists
    const { data: existingUsers, error: existingUsersError } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1)

    if (existingUsersError) {
      throw existingUsersError
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const { data: user, error: createUserError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password: hashedPassword,
        name: name?.trim() || null,
        role,
        is_active: true,
        approval_status: approvalStatus,
        auth_provider: 'password',
        avatar_url: null,
      })
      .select(USER_SELECT_COLUMNS)
      .single()

    if (createUserError || !user) {
      throw createUserError || new Error('Gagal membuat pengguna')
    }

    return createAuthenticatedResponse(user as UserRow, 201)
  } catch (error) {
    console.error('Signup error:', error)

    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat pendaftaran'

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
