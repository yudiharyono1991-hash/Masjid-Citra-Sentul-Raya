import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvqqmmmzyvmvdbwebcc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidnFxbW1tenl2bXZkYndlYmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDUyNzMsImV4cCI6MjEwMzcyMTI3M30.5k4TPt16nISTZgvytG19tvsl3ilgFW7h-0hCuKzCCRE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
