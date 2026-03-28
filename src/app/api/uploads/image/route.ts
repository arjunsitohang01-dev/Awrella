import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { isAdminRole, requireAdminUser, requireAuthenticatedUser, requireSuperAdminUser } from '@/lib/server-auth'
import { AVATAR_BUCKET, PHOTO_BUCKET, uploadImageToStorage } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const kind = formData.get('kind')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'File gambar wajib diisi' },
        { status: 400 }
      )
    }

    if (kind !== 'avatar' && kind !== 'photo' && kind !== 'content') {
      return NextResponse.json(
        { error: 'Jenis unggahan harus avatar, foto, atau konten' },
        { status: 400 }
      )
    }

    if (kind === 'avatar') {
      const session = await requireAuthenticatedUser(request)

      if ('response' in session) {
        return session.response
      }

      const uploaded = await uploadImageToStorage({
        bucket: AVATAR_BUCKET,
        file,
        folder: session.user.id,
      })

      if (isAdminRole(session.user.role)) {
        await createAdminAuditLog({
          adminId: session.user.id,
          action: 'AVATAR_UPLOADED',
          targetType: 'user',
          targetId: session.user.id,
          metadata: {
            bucket: AVATAR_BUCKET,
            objectPath: uploaded.objectPath,
          },
        })
      }

      return NextResponse.json(uploaded, { status: 201 })
    }

    const session = kind === 'content'
      ? await requireSuperAdminUser(request)
      : await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const uploaded = await uploadImageToStorage({
      bucket: PHOTO_BUCKET,
      file,
      folder: session.user.id,
    })

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'PHOTO_UPLOADED',
      targetType: kind === 'content' ? 'content' : 'photo',
      metadata: {
        bucket: PHOTO_BUCKET,
        objectPath: uploaded.objectPath,
        kind,
      },
    })

    return NextResponse.json(uploaded, { status: 201 })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal mengunggah gambar' },
      { status: 500 }
    )
  }
}
