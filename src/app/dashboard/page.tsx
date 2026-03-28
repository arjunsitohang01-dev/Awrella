'use client'

import { Cormorant_Garamond } from 'next/font/google'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Shield, Sparkles } from 'lucide-react'
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, SiteContentMap } from '@/lib/site-content'
import type { UserRole } from '@/lib/user-roles'

type LoginResponse = {
  user: {
    id: string
    email: string
    name: string | null
    role: UserRole
  }
}

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const adminAuthAccent = {
  login: 'bg-[#FFF7F8]',
  signup: 'bg-[#F9F6FF]',
} as const

export default function DashboardAuthPage() {
  const router = useRouter()
  const { setUser, setCurrentView } = useAppStore()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [siteContent, setSiteContent] = useState<SiteContentMap>(DEFAULT_SITE_CONTENT)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [name, setName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState('')
  const showcase = tab === 'login'
    ? {
        eyebrow: siteContent.admin_login_eyebrow,
        title: siteContent.admin_login_showcase_title,
        description: siteContent.admin_login_showcase_description,
        quote: siteContent.admin_login_showcase_quote,
        imageUrl: siteContent.admin_login_image_url,
        imageAlt: siteContent.admin_login_image_alt,
        accent: adminAuthAccent.login,
      }
    : {
        eyebrow: siteContent.admin_signup_eyebrow,
        title: siteContent.admin_signup_showcase_title,
        description: siteContent.admin_signup_showcase_description,
        quote: siteContent.admin_signup_showcase_quote,
        imageUrl: siteContent.admin_signup_image_url,
        imageAlt: siteContent.admin_signup_image_alt,
        accent: adminAuthAccent.signup,
      }

  const adminAuthHighlights = [
    {
      icon: Shield,
      title: siteContent.admin_auth_highlight_access_title,
      description: siteContent.admin_auth_highlight_access_description,
    },
    {
      icon: Sparkles,
      title: siteContent.admin_auth_highlight_content_title,
      description: siteContent.admin_auth_highlight_content_description,
    },
  ]

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [meResponse, contentResponse] = await Promise.all([
          fetch('/api/auth/me', { cache: 'no-store' }),
          fetch('/api/content', { cache: 'no-store' }),
        ])

        if (meResponse.ok) {
          const meData = await meResponse.json()
          if (meData.user?.role === 'SUPER_ADMIN') {
            setUser(meData.user)
            setCurrentView('admin')
            router.replace('/?view=admin')
            return
          }
        }

        if (contentResponse.ok) {
          const contentData = await contentResponse.json()
          setSiteContent(normalizeSiteContent(contentData.content))
        }
      } catch (error) {
        console.error('Failed to initialize admin portal:', error)
      }
    }

    void bootstrap()
  }, [router, setCurrentView, setUser])

  const goToAdminDashboard = (user: LoginResponse['user']) => {
    setUser(user)
    setCurrentView('admin')
    router.push('/?view=admin')
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Login gagal')
      }

      if (data.user.role !== 'SUPER_ADMIN') {
        throw new Error('Akun ini bukan super admin')
      }

      goToAdminDashboard(data.user)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')

    if (signupPassword !== confirmPassword) {
      setSignupError('Password dan konfirmasi password harus sama')
      return
    }

    if (signupPassword.length < 6) {
      setSignupError('Password minimal 6 karakter')
      return
    }

    setSignupLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: signupEmail,
          password: signupPassword,
          registerAsAdmin: true,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Pendaftaran super admin gagal')
      }

      goToAdminDashboard(data.user)
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : 'Pendaftaran super admin gagal')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F4EF] px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="landing-glow absolute left-[-7rem] top-[-5rem] h-72 w-72 rounded-full bg-[#E8BFCB]/50 blur-3xl" />
        <div className="landing-drift absolute right-[-4rem] top-[10%] h-80 w-80 rounded-full bg-[#DCEAF6]/65 blur-3xl" />
        <div className="landing-glow absolute bottom-[-6rem] left-[20%] h-72 w-72 rounded-full bg-[#E2EEDB]/55 blur-3xl" />
        <div className="landing-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="hidden lg:block">
          <div className="relative">
            <div className="landing-float-delayed absolute -left-4 top-12 w-56 rounded-[1.7rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-4 shadow-[0_22px_60px_-32px_rgba(47,42,42,0.35)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8B7676]">Portal yang tenang</p>
              <p className={`${cormorant.className} mt-3 text-2xl text-[#2F2A2A]`}>Panel belakang untuk menjaga semua detail tetap lembut.</p>
            </div>

            <div className="landing-float-slow absolute -right-2 bottom-10 w-56 rounded-[1.7rem] border border-[#DCEAF6] bg-[#F8FBFF]/92 p-4 shadow-[0_22px_60px_-32px_rgba(47,42,42,0.35)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-[#6E8091]">Catatan akses</p>
              <p className="mt-3 text-sm leading-6 text-[#6E6666]">{showcase.quote}</p>
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-[#EADCCF] bg-[#FFFDF9]/92 p-4 shadow-[0_34px_90px_-45px_rgba(47,42,42,0.48)] backdrop-blur">
              <div className="overflow-hidden rounded-[2rem]">
                {showcase.imageUrl ? (
                  <img
                    src={showcase.imageUrl}
                    alt={showcase.imageAlt}
                    className="h-[42rem] w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-[42rem] items-center justify-center bg-[#F7F4EF] px-8 text-center text-sm leading-7 text-[#6E6666]">
                    Foto portal admin belum ditambahkan.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative">
          <Card className="overflow-hidden rounded-[2.4rem] border-[#EADCCF] bg-[#FFFDF9]/95 shadow-[0_32px_90px_-45px_rgba(47,42,42,0.48)] backdrop-blur">
            <div className={`border-b border-[#EADCCF] ${showcase.accent} px-6 py-6 sm:px-8`}>
              <p className="text-xs uppercase tracking-[0.28em] text-[#8B7676]">{showcase.eyebrow}</p>
              <h1 className={`${cormorant.className} mt-4 text-4xl leading-tight text-[#2F2A2A] sm:text-5xl`}>
                {siteContent.admin_auth_portal_title}
              </h1>
              <p className={`${cormorant.className} mt-4 max-w-xl text-3xl leading-tight text-[#2F2A2A] sm:text-[2.2rem]`}>
                {showcase.title}
              </p>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#6E6666] sm:text-base">
                {showcase.description}
              </p>
            </div>

            <CardContent className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-3 sm:grid-cols-2">
                {adminAuthHighlights.map((item) => (
                  <div key={item.title} className="rounded-[1.5rem] border border-[#EADCCF] bg-[#FFFCF8] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFDF9] shadow-sm">
                      <item.icon className="h-4 w-4 text-[#2F2A2A]" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-[#2F2A2A]">{item.title}</p>
                    <p className="mt-2 text-xs leading-6 text-[#6E6666]">{item.description}</p>
                  </div>
                ))}
              </div>

              <Tabs value={tab} onValueChange={(value) => setTab(value as 'login' | 'signup')} className="space-y-5">
                <TabsList className="grid grid-cols-2 rounded-2xl bg-[#F7F4EF] p-1">
                  <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-[#FFFDF9]">
                    Masuk Super Admin
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-[#FFFDF9]">
                    Daftar Super Admin
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleAdminLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="admin-login-email">Email</Label>
                      <Input
                        id="admin-login-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="admin-login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6666] hover:text-[#2F2A2A]"
                          aria-label={showLoginPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <Alert className="rounded-2xl border-[#E8BFCB]/50 bg-[#F4D9DE]/35">
                        <AlertDescription className="text-[#2F2A2A]">{loginError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-2xl bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
                      disabled={loginLoading}
                    >
                      {loginLoading ? 'Sedang masuk...' : 'Masuk sebagai Super Admin'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleAdminSignup} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="admin-signup-name">Nama</Label>
                      <Input
                        id="admin-signup-name"
                        type="text"
                        placeholder="Nama kamu"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-signup-email">Email</Label>
                      <Input
                        id="admin-signup-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="admin-signup-password"
                          type={showSignupPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6666] hover:text-[#2F2A2A]"
                          aria-label={showSignupPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-signup-confirm">Konfirmasi Password</Label>
                      <div className="relative">
                        <Input
                          id="admin-signup-confirm"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="h-12 rounded-2xl border-[#EADCCF] bg-[#FFFCF8] pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6666] hover:text-[#2F2A2A]"
                          aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {signupError && (
                      <Alert className="rounded-2xl border-[#E8BFCB]/50 bg-[#F4D9DE]/35">
                        <AlertDescription className="text-[#2F2A2A]">{signupError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-2xl bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
                      disabled={signupLoading}
                    >
                      {signupLoading ? 'Sedang membuat akun super admin...' : 'Daftar sebagai Super Admin'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="border-t border-[#EADCCF] pt-5 text-center">
                <a href="/" className="text-sm text-[#6E6666] hover:text-[#2F2A2A]">
                  Kembali ke beranda
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
