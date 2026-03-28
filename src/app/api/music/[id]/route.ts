import { NextRequest, NextResponse } from 'next/server'
import { createAdminAuditLog } from '@/lib/admin-audit'
import { getSupabaseServerClient, mapMusicRowToResponse } from '@/lib/supabase'
import { normalizeSpotifyMusicType, parseSpotifyResource } from '@/lib/spotify'
import { requireAdminUser } from '@/lib/server-auth'

// PUT update music item
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
    const { title, spotifyUrl, type, order, featured } = body
    const supabase = getSupabaseServerClient()
    const { data: existingMusic, error: existingMusicError } = await supabase
      .from('music')
      .select('id, title, spotify_url, type, featured, order, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (existingMusicError) {
      throw existingMusicError
    }

    if (!existingMusic) {
      return NextResponse.json(
        { error: 'Item musik tidak ditemukan' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const trimmedTitle = typeof title === 'string' ? title.trim() : undefined
    if (trimmedTitle !== undefined) {
      if (!trimmedTitle) {
        return NextResponse.json(
          { error: 'Judul musik tidak boleh kosong' },
          { status: 400 }
        )
      }
      updateData.title = trimmedTitle
    }

    if (spotifyUrl !== undefined || type !== undefined) {
      const normalizedType = normalizeSpotifyMusicType(type || existingMusic.type)
      if (!normalizedType) {
        return NextResponse.json(
          { error: 'Tipe harus berupa "track" atau "playlist"' },
          { status: 400 }
        )
      }

      const parsedSpotify = parseSpotifyResource(String(spotifyUrl ?? existingMusic.spotify_url), normalizedType)
      if (!parsedSpotify) {
        return NextResponse.json(
          { error: 'URL Spotify tidak valid. Gunakan link track atau playlist Spotify.' },
          { status: 400 }
        )
      }

      updateData.spotify_url = parsedSpotify.embedUrl
      updateData.type = parsedSpotify.type
    }

    if (order !== undefined) updateData.order = order
    if (featured !== undefined) updateData.featured = featured

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada field valid untuk diperbarui' },
        { status: 400 }
      )
    }

    if (featured === true) {
      const { error: resetFeaturedError } = await supabase
        .from('music')
        .update({ featured: false })
        .neq('id', id)
        .eq('featured', true)

      if (resetFeaturedError) {
        throw resetFeaturedError
      }
    }

    const { data: music, error } = await supabase
      .from('music')
      .update(updateData)
      .eq('id', id)
      .select('id, title, spotify_url, type, featured, order, created_at, updated_at')
      .maybeSingle()

    if (error) {
      throw error
    }
    if (!music) {
      return NextResponse.json(
        { error: 'Item musik tidak ditemukan' },
        { status: 404 }
      )
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'MUSIC_UPDATED',
      targetType: 'music',
      targetId: music.id,
      metadata: {
        changedTitle: trimmedTitle !== undefined && trimmedTitle !== existingMusic.title,
        changedSpotifyUrl:
          updateData.spotify_url !== undefined && updateData.spotify_url !== existingMusic.spotify_url,
        changedType: updateData.type !== undefined && updateData.type !== existingMusic.type,
        changedOrder: order !== undefined && order !== existingMusic.order,
        changedFeatured: featured !== undefined && featured !== existingMusic.featured,
      },
    })

    return NextResponse.json({ music: mapMusicRowToResponse(music) })
  } catch (error) {
    console.error('Error updating music:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui musik' },
      { status: 500 }
    )
  }
}

// DELETE music item
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
    const { data: existingMusic, error: existingMusicError } = await supabase
      .from('music')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingMusicError) {
      throw existingMusicError
    }

    if (!existingMusic) {
      return NextResponse.json(
        { error: 'Item musik tidak ditemukan' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('music')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    await createAdminAuditLog({
      adminId: session.user.id,
      action: 'MUSIC_DELETED',
      targetType: 'music',
      targetId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting music:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus musik' },
      { status: 500 }
    )
  }
}
