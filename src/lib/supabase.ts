import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://vznwvenzjzccvtqorhas.supabase.co'
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WxAuvXXEi8PvVAlKaDUYyw_hhO-q0SA'

export const supabase = createClient(url, publishableKey)
