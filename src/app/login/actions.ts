'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export async function login(prevState: any, formData: FormData) {
  try {
    const supabase = await createClient()

    const result = LoginSchema.safeParse(Object.fromEntries(formData))

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { email, password } = result.data

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error.message)
      // We could log failed login attempts here if we had a workspace context
      return { error: 'Authentication failed. Please check your credentials.' }
    }

    // Successful Login Logging
    if (data.user) {
      const adminClient = createAdminClient()
      const { data: userData, error: userError } = await adminClient
        .from('users')
        .select('workspace_id')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        console.error('Error fetching user data after login:', userError.message)
        // Even if logging fails, we proceed with the login
      } else if (userData?.workspace_id) {
        await adminClient.from('audit_logs').insert({
          workspace_id: userData.workspace_id,
          actor_id: data.user.id,
          actor_email: email,
          action_type: 'login_success',
          description: 'User logged into the portal'
        })
      }
    }

    revalidatePath('/portal', 'layout')
    redirect('/portal')
  } catch (err: any) {
    if (err?.digest === 'NEXT_REDIRECT') throw err
    console.error('Unhandled login error:', err)
    return { error: 'A server error occurred during authentication.' }
  }
}

