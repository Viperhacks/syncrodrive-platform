
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with your project's URL and anon key
export const supabase = createClient(
  'https://YOUR_PROJECT_URL.supabase.co',  // Replace with your Supabase project URL
  'YOUR_ANON_KEY'  // Replace with your Supabase anon key
);
