import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient, mapUserRowToResponse, USER_SELECT_COLUMNS } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/server-auth'
import { isAdminRole, isSuperAdminRole, normalizeUserRole, type UserRole } from '@/lib/user-roles'

// PUT update user
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
    const { name, role, isActive, approvalStatus } = body

    // Validate role if provided
    if (role && !['USER', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Peran tidak valid' },
        { status: 400 }
      )
    }

    if (approvalStatus && !['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      return NextResponse.json(
        { error: 'Status persetujuan tidak valid' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select(USER_SELECT_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (targetUserError) {
      throw targetUserError
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    if (session.user.id === targetUser.id && isActive === false) {
      return NextResponse.json(
        { error: 'Anda tidak bisa menangguhkan akun sendiri' },
        { status: 400 }
      )
    }

    const actorIsSuperAdmin = isSuperAdminRole(session.user.role)
    const targetIsAdmin = isAdminRole(targetUser.role)

    if (!actorIsSuperAdmin && targetIsAdmin) {
      return NextResponse.json(
        { error: 'Hanya super admin yang bisa mengelola akun admin lain' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (role) {
      if (!actorIsSuperAdmin) {
        return NextResponse.json(
          { error: 'Hanya super admin yang bisa mengubah peran pengguna' },
          { status: 403 }
        )
      }

      if (session.user.id === targetUser.id && role !== normalizeUserRole(session.user.role)) {
        return NextResponse.json(
          { error: 'Anda tidak bisa mengubah peran sendiri' },
          { status: 400 }
        )
      }

      updateData.role = role as UserRole
    }
    if (isActive !== undefined) updateData.is_active = isActive
    if (approvalStatus) updateData.approval_status = approvalStatus

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada field valid untuk diperbarui' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(USER_SELECT_COLUMNS)
      .maybeSingle()

    if (error) {
      throw error
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    if (role && role !== targetUser.role) {
      await createAdminAuditLog({
        adminId: session.user.id,
        action: 'USER_ROLE_CHANGED',
        targetType: 'user',
        targetId: user.id,
        metadata: {
          previousRole: targetUser.role,
          nextRole: role,
        },
      })
    }

    if (isActive !== undefined && isActive !== targetUser.is_active) {
      await createAdminAuditLog({
        adminId: session.user.id,
        action: 'USER_STATUS_CHANGED',
        targetType: 'user',
        targetId: user.id,
        metadata: {
          previousStatus: targetUser.is_active ? 'active' : 'suspended',
          nextStatus: isActive ? 'active' : 'suspended',
        },
      })
    }

    if (approvalStatus && approvalStatus !== targetUser.approval_status) {
      await createAdminAuditLog({
        adminId: session.user.id,
        action: 'USER_APPROVAL_CHANGED',
        targetType: 'user',
        targetId: user.id,
        metadata: {
          previousApprovalStatus: targetUser.approval_status,
          nextApprovalStatus: approvalStatus,
        },
      })
    }

    return NextResponse.json({ user: mapUserRowToResponse(user) })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui pengguna' },
      { status: 500 }
    )
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    if (!isSuperAdminRole(session.user.role)) {
      return NextResponse.json(
        { error: 'Hanya super admin yang bisa menghapus pengguna secara permanen' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = getSupabaseServerClient()
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Anda tidak bisa menghapus akun sendiri' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'USER_DELETED',
      targetType: 'user',
      targetId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus pengguna' },
      { status: 500 }
    )
  }
}
