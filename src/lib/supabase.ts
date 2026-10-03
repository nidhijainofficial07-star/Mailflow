import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://fwdcpjtmqipqnsapksbr.supabase.co";

const supabaseAnonKey =
  "sb_publishable_0CKjGx_ivWq4Xxfcp8w9BQ_htJMKExf";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);