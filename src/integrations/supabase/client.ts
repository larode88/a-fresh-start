import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://iuvwlumiwvekswflskse.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dndsdW1pd3Zla3N3Zmxza3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDI3NTQsImV4cCI6MjA4MjM3ODc1NH0.OeQ026eH3_WiWdMRfJnDhynR9TIjdrkfCHkAHpUsQY0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
