import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function auth() {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return null
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    return {
      ...session,
      user: {
        ...session.user,
        profile
      }
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

export async function requireAuth() {
  const session = await auth()
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session
}

export function getSupabaseClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}