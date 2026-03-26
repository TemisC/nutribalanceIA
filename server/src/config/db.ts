import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Service role client for server-side operations (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

export const testConnection = async () => {
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        console.log('✅ Connected to Supabase (PostgreSQL)!');
        return true;
    } catch (error: any) {
        console.error('❌ Supabase connection failed:', error.message);
        return false;
    }
};

export default supabase;
