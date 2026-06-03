'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/plan/new')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const gender = formData.get('gender') as string
  const age = formData.get('age') as string
  const subject_group = formData.get('subject_group') as string
  const grade_levels = formData.getAll('grade_levels')

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        gender,
        age,
        subject_group,
        grade_levels: JSON.stringify(grade_levels)
      }
    }
  })

  if (error) {
    redirect(`/register?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/plan/new')
}

export async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
