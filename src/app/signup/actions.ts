'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workshopName: z.string().min(1, 'Workshop name is required').trim()
})

export async function signup(prevState: any, formData: FormData) {
  try {
    const supabase = await createClient()

    const result = SignupSchema.safeParse(Object.fromEntries(formData))

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { email, password, workshopName } = result.data

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          workspace_name: workshopName
        }
      }
    })

    if (error) {
      console.error('Signup error:', error.message)
      return { error: error.message }
    }

    revalidatePath('/portal', 'layout')
    redirect('/portal')
  } catch (err: any) {
    if (err?.digest === 'NEXT_REDIRECT') throw err
    console.error('Unhandled signup error:', err)
    return { error: 'A server error occurred during registration.' }
  }
}
