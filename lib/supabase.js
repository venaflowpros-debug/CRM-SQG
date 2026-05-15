import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://hrnwvubsbimdhydihqdh.supabase.co'

const supabaseKey =
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_KEY ||
  'sb_publishable_iGbLZbps8zm-W9tpBsxPLA_jbzzeibh'

export const supabase = createClient(supabaseUrl, supabaseKey)
