import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  balance: number;
  referral_code: string;
  referred_by: string | null;
  is_admin: boolean;
  wallet_address: string;
  phone_number: string;
  phone_verified: boolean;
  referral_bonus_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  profit_rate: number;
  duration_days: number;
  is_active: boolean;
  image_url: string;
  min_amount: number;
  max_purchases_per_user: number;
  created_at: string;
  updated_at: string;
};

export type Investment = {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  profit_rate: number;
  profit_amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  products?: Product;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'profit' | 'referral_bonus';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  description: string;
  reference_id: string | null;
  withdrawal_address: string | null;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  user_id: string;
  sender: 'user' | 'support';
  message: string;
  is_read: boolean;
  created_at: string;
};

export type PlatformSetting = {
  key: string;
  value: string;
  updated_at: string;
};
