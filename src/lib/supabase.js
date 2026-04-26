import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pwrphlqbxwpeofzupgly.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cnBobHFieHdwZW9menVwZ2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTM3NzUsImV4cCI6MjA5Mjc4OTc3NX0.uFvQtWiI0NcX9T8SHaNgt-TXb8xnK568d5mQ6NYsqxU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
})