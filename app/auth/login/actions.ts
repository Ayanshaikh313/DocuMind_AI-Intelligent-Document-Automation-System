// actions.ts (server)
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function login(formData) {
  const supabase = await createClient()

  const email = (formData.get('email') || '').toString().trim()
  const password = (formData.get('password') || '').toString()
  const designation = (formData.get('designation') || '').toString().trim()
  const department = (formData.get('department') || '').toString().trim()

  if (!email || !password || !designation) {
    return { success: false, error: 'Missing required fields (email, password, designation).' }
  }
  if (designation !== 'Director' && !department) {
    return { success: false, error: 'Department is required for the selected designation.' }
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) return { success: false, error: authError.message || 'Authentication failed.' }
    if (!authData?.user?.id) return { success: false, error: 'No user returned after authentication.' }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) return { success: false, error: 'Profile not found for this user.' }

    // Example validation - return error messages instead of redirect
    if (designation === 'Department Manager') {
      if (!profile.is_branch_manager) {
        return { success: false, error: 'You do not have Branch Manager access.' }
      }
      if (profile.department !== department) {
        return { success: false, error: 'Department does not match our records.' }
      }
      try { revalidatePath('/') } catch(e) {}
      return { success: true, redirectTo: '/user/branch-manager' }
    }

    // Director / Others similar...
    if (designation === 'Director') {
      if (!profile.is_director) return { success: false, error: 'You do not have Director access.' }
      try { revalidatePath('/') } catch(e) {}
      return { success: true, redirectTo: '/user/director' }
    }

    if (designation === 'Others') {
      if (!profile.is_others) return { success: false, error: 'You do not have Others access.' }
      if (profile.department !== department) return { success: false, error: 'Department does not match our records.' }
      try { revalidatePath('/') } catch(e) {}
      return { success: true, redirectTo: '/user/others' }
    }

    return { success: false, error: 'Invalid designation provided.' }
  } catch (err) {
    console.error('Unexpected login error:', err)
    return { success: false, error: 'An unexpected server error occurred during login.' }
  }
}
