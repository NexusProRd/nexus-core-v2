import { NextResponse, type NextRequest } from 'next/server'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const rawSession = request.cookies.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)

  if (!session.valid) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard', '/login', '/onboarding'],
}
