import { getSupabaseServerClient } from '@/lib/supabase'

export type AuditAction =
  | 'PROFILE_UPDATED'
  | 'PASSWORD_UPDATED'
  | 'CONTENT_UPDATED'
  | 'MUSIC_CREATED'
  | 'MUSIC_UPDATED'
  | 'MUSIC_DELETED'
  | 'PHOTO_CREATED'
  | 'PHOTO_UPDATED'
  | 'PHOTO_DELETED'
  | 'PHOTO_REORDERED'
  | 'PHOTO_UPLOADED'
  | 'AVATAR_UPLOADED'
  | 'USER_STATUS_CHANGED'
  | 'USER_APPROVAL_CHANGED'
  | 'USER_ROLE_CHANGED'
  | 'USER_DELETED'
  | 'COMMENT_HIDDEN'
  | 'COMMENT_UNHIDDEN'
  | 'COMMENT_DELETED'

export async function createAdminAuditLog(input: {
  adminId: string
  action: AuditAction
  targetType: string
  targetId?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('admin_audit_logs').insert({
      admin_id: input.adminId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId || null,
      metadata: input.metadata || {},
    })

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Failed to write admin audit log:', error)
  }
}
