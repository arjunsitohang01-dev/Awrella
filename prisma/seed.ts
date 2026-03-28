import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create primary super admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@awrella.com' },
    update: {},
    create: {
      email: 'admin@awrella.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })
  console.log('Created super admin user:', superAdmin.email)

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      password: await bcrypt.hash('user123', 10),
      name: 'Test User',
      role: 'USER',
      isActive: true,
    },
  })
  console.log('Created test user:', testUser.email)

  // Create music items
  const music1 = await prisma.music.upsert({
    where: { id: 'music-1' },
    update: {},
    create: {
      id: 'music-1',
      title: 'Chill Vibes',
      spotifyUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX7Jl5KP2eZa8',
      type: 'playlist',
      featured: true,
      order: 0,
    },
  })

  const music2 = await prisma.music.upsert({
    where: { id: 'music-2' },
    update: {},
    create: {
      id: 'music-2',
      title: 'Late Night Jazz',
      spotifyUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX0SM0LYsmbJp',
      type: 'playlist',
      featured: false,
      order: 1,
    },
  })

  const music3 = await prisma.music.upsert({
    where: { id: 'music-3' },
    update: {},
    create: {
      id: 'music-3',
      title: 'Acoustic Morning',
      spotifyUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC',
      type: 'playlist',
      featured: false,
      order: 2,
    },
  })
  console.log('Created music items')

  // Create content
  const contentItems = [
    { key: 'landingTitle', value: 'Awrella' },
    { key: 'landingSubtitle', value: 'A Private Space for Little Memories' },
    { key: 'landingDescription', value: 'A small private space for photos, music, and quiet feelings.' },
    { key: 'aboutText', value: 'Awrella is a private digital memory and music space that combines photos, music, and visitor messages in a warm, gentle, personal, and exclusive atmosphere.' },
    { key: 'favoritesText', value: 'Simple things that bring joy: morning light, quiet moments, good music, and memories worth keeping.' },
  ]

  for (const item of contentItems) {
    await prisma.content.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: item,
    })
  }
  console.log('Created content items')

  // Create sample comments
  const comments = [
    { content: 'Love this space.', noteColor: 'CREAM' as const, userId: testUser.id },
    { content: 'Playlist-nya bikin adem.', noteColor: 'BLUE' as const, userId: testUser.id },
    { content: 'Foto-fotonya keren.', noteColor: 'BLUSH' as const, userId: testUser.id },
    { content: 'Aku suka vibes-nya.', noteColor: 'SAGE' as const, userId: testUser.id },
  ]

  for (const comment of comments) {
    await prisma.comment.create({
      data: comment,
    })
  }
  console.log('Created sample comments')

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
