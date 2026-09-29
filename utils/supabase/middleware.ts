import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser()
  
  // Protect routes logic
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isLandingPage = request.nextUrl.pathname === '/';
  // Demo fixtures are ONLY permitted in local development; production strictly requires authentication
  const isDemoPreview = process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/plan/v3/demo-');
  
  // API routes are deliberately excluded by middleware.ts and must authorize
  // themselves. This guard is only the page-navigation boundary.
  const isPublicPage = isAuthRoute || isLandingPage || isDemoPreview;
  if (!user && !isPublicPage) {
    // If not logged in and trying to access a protected page, redirect to login.
    // Keep the requested path so the user can continue their normal workflow.
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
  }
  
  if (user) {
    if (isAuthRoute || isLandingPage) {
      // If logged in and trying to access login/register/landing, redirect to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
    // Fetch profile to check role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/' // Redirect to home if not admin
        return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
