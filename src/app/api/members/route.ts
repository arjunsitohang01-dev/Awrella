import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)

    if ('response' in session) {
      return session.response
    }

    const supabase = getSupabaseServerClient()
    const { data: members, error } = await supabase
      .from('users')
      .select('id, name, email, approval_status, created_at')
      .eq('role', 'USER')
      .in('approval_status', ['PENDING', 'APPROVED'])
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      throw error
    }

    return NextResponse.json({
      members: (members || []).map((member) => ({
        id: member.id,
        name: member.name || member.email.split('@')[0] || 'Pengguna',
        approvalStatus: member.approval_status,
        joinedAt: member.created_at,
      })),
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Gagal memuat daftar member' },
      { status: 500 }
    )
  }
}
