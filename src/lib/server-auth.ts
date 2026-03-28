import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseServerClient,
  mapUserRowToResponse,
  USER_SELECT_COLUMNS,
  UserRow,
} from '@/lib/supabase'
import { isAdminRole as hasAdminPrivileges, isSuperAdminRole } from '@/lib/user-roles'

const SESSION_COOKIE_NAME = 'awrella_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

type SessionPayload = {
  sub: string
  exp: number
}

type GuardResult =
  | { user: UserRow; response?: never }
  | { response: NextResponse; user?: never }

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error(
      'Missing APP_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY. Session signing requires one of them.',
    )
  }

  return secret
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url')
}

function createSessionToken(userId: string) {
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split('.')

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const providedBuffer = Buffer.from(signature)

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload

    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

function buildUnauthorizedResponse(message = 'Tidak diizinkan', status = 401) {
  return NextResponse.json({ error: message }, { status })
}

function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(userId),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function createAuthenticatedResponse(user: UserRow, status = 200) {
  const response = NextResponse.json({ user: mapUserRowToResponse(user) }, { status })
  setSessionCookie(response, user.id)
  return response
}

export async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const payload = verifySessionToken(token)
  if (!payload) {
    return null
  }

  const supabase = getSupabaseServerClient()
  const { data: user, error } = await supabase
    .from('users')
    .select(USER_SELECT_COLUMNS)
    .eq('id', payload.sub)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!user || !user.is_active) {
    return null
  }

  return user as UserRow
}

export async function requireAuthenticatedUser(request: NextRequest): Promise<GuardResult> {
  const user = await getSessionUser(request)

  if (!user) {
    return { response: buildUnauthorizedResponse('Silakan login terlebih dahulu') }
  }

  return { user }
}

export async function requireAdminUser(request: NextRequest): Promise<GuardResult> {
  const session = await requireAuthenticatedUser(request)

  if ('response' in session) {
    return session
  }

  if (!hasAdminPrivileges(session.user.role)) {
    return { response: buildUnauthorizedResponse('Akses admin diperlukan', 403) }
  }

  return session
}

export async function requireSuperAdminUser(request: NextRequest): Promise<GuardResult> {
  const session = await requireAuthenticatedUser(request)

  if ('response' in session) {
    return session
  }

  if (!isSuperAdminRole(session.user.role)) {
    return { response: buildUnauthorizedResponse('Akses super admin diperlukan', 403) }
  }

  return session
}

export function isAdminRole(role: UserRow['role']) {
  return hasAdminPrivileges(role)
}
