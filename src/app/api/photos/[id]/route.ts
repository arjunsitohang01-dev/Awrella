import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient, mapPhotoRowToResponse } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/server-auth'
import { PHOTO_BUCKET, deleteStorageObjectByPublicUrl } from '@/lib/storage'

// PUT update photo
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
    const { imageUrl, caption, order, featured } = body
    const updateData: Record<string, unknown> = {}

    if (imageUrl) updateData.image_url = imageUrl
    if (caption !== undefined) updateData.caption = caption
    if (order !== undefined) updateData.order = order
    if (featured !== undefined) updateData.featured = featured

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada field valid untuk diperbarui' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServerClient()
    const { data: existingPhoto, error: existingPhotoError } = await supabase
      .from('photos')
      .select('id, image_url, caption, order, featured')
      .eq('id', id)
      .maybeSingle()

    if (existingPhotoError) {
      throw existingPhotoError
    }

    if (!existingPhoto) {
      return NextResponse.json(
        { error: 'Foto tidak ditemukan' },
        { status: 404 }
      )
    }

    const { data: photo, error } = await supabase
      .from('photos')
      .update(updateData)
      .eq('id', id)
      .select('id, image_url, caption, order, featured, user_id, created_at, updated_at')
      .maybeSingle()

    if (error) {
      throw error
    }
    if (!photo) {
      return NextResponse.json(
        { error: 'Foto tidak ditemukan' },
        { status: 404 }
      )
    }

    if (imageUrl && existingPhoto.image_url !== photo.image_url) {
      try {
        await deleteStorageObjectByPublicUrl(existingPhoto.image_url, PHOTO_BUCKET)
      } catch (storageError) {
        console.error('Failed to delete replaced photo asset:', storageError)
      }
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'PHOTO_UPDATED',
      targetType: 'photo',
      targetId: photo.id,
      metadata: {
        changedImage: imageUrl !== undefined,
        changedCaption: caption !== undefined,
        changedOrder: order !== undefined,
        changedFeatured: featured !== undefined,
      },
    })

    return NextResponse.json({ photo: mapPhotoRowToResponse(photo) })
  } catch (error) {
    console.error('Error updating photo:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui foto' },
      { status: 500 }
    )
  }
}

// DELETE photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const { id } = await params
    const supabase = getSupabaseServerClient()
    const { data: existingPhoto, error: existingPhotoError } = await supabase
      .from('photos')
      .select('id, image_url')
      .eq('id', id)
      .maybeSingle()

    if (existingPhotoError) {
      throw existingPhotoError
    }

    if (!existingPhoto) {
      return NextResponse.json(
        { error: 'Foto tidak ditemukan' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    try {
      await deleteStorageObjectByPublicUrl(existingPhoto.image_url, PHOTO_BUCKET)
    } catch (storageError) {
      console.error('Failed to delete photo asset:', storageError)
    }
    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'PHOTO_DELETED',
      targetType: 'photo',
      targetId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus foto' },
      { status: 500 }
    )
  }
}
