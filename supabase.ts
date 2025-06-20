import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Check if environment variables are properly configured
if (!supabaseUrl || !supabaseAnonKey || 
    supabaseUrl.includes('your-project') || 
    supabaseAnonKey.includes('your-anon-key')) {
  console.error('⚠️  Supabase not configured properly!');
  console.error('Please update your .env.local file with your actual Supabase credentials:');
  console.error('1. Go to your Supabase project dashboard');
  console.error('2. Navigate to Settings > API');
  console.error('3. Copy your Project URL and anon/public key');
  console.error('4. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  console.error('5. Restart the development server');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (supabaseUrl && !supabaseUrl.includes('your-project')) {
  console.log('✅ Supabase client initialized successfully');
} else {
  console.log('❌ Supabase client initialized with placeholder values - please configure your environment variables');
}