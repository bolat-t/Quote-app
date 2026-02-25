
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Project: Ulbo
// URL: https://gzbeqjxpbkongijxtrhi.supabase.co
const supabaseUrl = 'https://gzbeqjxpbkongijxtrhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YmVxanhwYmtvbmdpanh0cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MjMwMDQsImV4cCI6MjA4NTk5OTAwNH0.xnpNdWNc_jq1hzA0ugxAeLBYe7Ib0oyE2xxaadebqJA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
