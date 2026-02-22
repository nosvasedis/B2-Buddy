
import { createClient } from '@supabase/supabase-js';

// The Project URL (HTTPS, not Postgres)
const supabaseUrl = 'https://bqslberfhmcaogfukorc.supabase.co';

// The provided publishable key
const supabaseKey = 'sb_publishable_zJ3nwyPusH-LsNgZIQtYqw_VGMbGOKP';

export const supabase = createClient(supabaseUrl, supabaseKey);
