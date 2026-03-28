import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/server-auth'
import { getSupabaseServerClient, mapUserRowToResponse, USER_SELECT_COLUMNS } from '@/lib/supabase'

// GET all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const supabase = getSupabaseServerClient()
    const { data: users, error } = await supabase
      .from('users')
      .select(USER_SELECT_COLUMNS)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ users: (users || []).map(mapUserRowToResponse) })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Gagal memuat pengguna' },
      { status: 500 }
    )
  }
}
