import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/server-auth'

type AuditLogRow = {
  id: string
  admin_id: string | null
  action: string
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type AuditUserRow = {
  id: string
  email: string
  name: string | null
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const searchParams = request.nextUrl.searchParams
    const limitParam = Number(searchParams.get('limit') || '10')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10

    const supabase = getSupabaseServerClient()
    const { data: logs, error } = await supabase
      .from('admin_audit_logs')
      .select('id, admin_id, action, target_type, target_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    const typedLogs = (logs || []) as AuditLogRow[]
    const adminIds = [...new Set(typedLogs.map((item) => item.admin_id).filter(Boolean))] as string[]

    let adminsById = new Map<string, AuditUserRow>()
    if (adminIds.length > 0) {
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('id, email, name')
        .in('id', adminIds)

      if (adminsError) {
        throw adminsError
      }

      adminsById = new Map((admins || []).map((item) => [item.id, item as AuditUserRow]))
    }

    return NextResponse.json({
      logs: typedLogs.map((log) => {
        const admin = log.admin_id ? adminsById.get(log.admin_id) : null

        return {
          id: log.id,
          action: log.action,
          targetType: log.target_type,
          targetId: log.target_id,
          metadata: log.metadata || {},
          createdAt: log.created_at,
          admin: admin
            ? {
                id: admin.id,
                name: admin.name,
                email: admin.email,
              }
            : null,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Gagal memuat log audit' },
      { status: 500 }
    )
  }
}
