import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient, mapPhotoRowToResponse } from '@/lib/supabase'
import { requireAdminUser, requireAuthenticatedUser } from '@/lib/server-auth'

// GET all photos
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(request)
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit'))
    const requestedOffset = Number(request.nextUrl.searchParams.get('offset'))
    const requestedAfterOrder = Number(request.nextUrl.searchParams.get('afterOrder'))
    const requestedAfterId = request.nextUrl.searchParams.get('afterId')?.trim() || null
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.trunc(requestedLimit), 48)
      : null
    const offset = Number.isFinite(requestedOffset) && requestedOffset >= 0
      ? Math.trunc(requestedOffset)
      : 0
    const afterOrder = Number.isFinite(requestedAfterOrder) ? Math.trunc(requestedAfterOrder) : null
    const afterId = requestedAfterId && /^[0-9a-f-]{36}$/i.test(requestedAfterId)
      ? requestedAfterId
      : null

    if ('response' in session) {
      return session.response
    }

    const supabase = getSupabaseServerClient()
    let query = supabase
      .from('photos')
      .select('id, image_url, caption, order, featured, user_id, created_at, updated_at', { count: 'exact' })
      .order('order', { ascending: true })
      .order('id', { ascending: true })

    if (afterOrder !== null && afterId) {
      query = query.or(`order.gt.${afterOrder},and(order.eq.${afterOrder},id.gt.${afterId})`)
    } else if (limit !== null && offset > 0) {
      query = query.range(offset, offset + limit - 1)
    } else if (limit !== null) {
      query = query.limit(limit)
    }

    const { data: photos, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      photos: (photos || []).map(mapPhotoRowToResponse),
      totalCount: count ?? (photos || []).length,
    })
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json(
      { error: 'Gagal memuat foto' },
      { status: 500 }
    )
  }
}

// POST create new photo
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminUser(request)

    if ('response' in session) {
      return session.response
    }

    const body = await request.json()
    const { imageUrl, caption, order, featured } = body
    const supabase = getSupabaseServerClient()

    // Validate input
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL gambar wajib diisi' },
        { status: 400 }
      )
    }

    // Get max order if not provided
    let photoOrder = order
    if (photoOrder === undefined) {
      const { data: maxOrderPhoto, error: maxOrderError } = await supabase
        .from('photos')
        .select('order')
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (maxOrderError) {
        throw maxOrderError
      }
      photoOrder = maxOrderPhoto ? maxOrderPhoto.order + 1 : 0
    }

    // Create photo
    const { data: photo, error: createPhotoError } = await supabase
      .from('photos')
      .insert({
        image_url: imageUrl,
        caption: caption || null,
        order: photoOrder,
        featured: featured || false,
        user_id: session.user.id,
      })
      .select('id, image_url, caption, order, featured, user_id, created_at, updated_at')
      .single()

    if (createPhotoError || !photo) {
      throw createPhotoError || new Error('Gagal membuat foto')
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'PHOTO_CREATED',
      targetType: 'photo',
      targetId: photo.id,
      metadata: {
        featured: photo.featured,
        caption: photo.caption,
      },
    })

    return NextResponse.json({ photo: mapPhotoRowToResponse(photo) }, { status: 201 })
  } catch (error) {
    console.error('Error creating photo:', error)
    return NextResponse.json(
      { error: 'Gagal membuat foto' },
      { status: 500 }
    )
  }
}
