import { createClient } from "@supabase/supabase-js";

// Chave publishable (anon) — segura no código.
const SUPABASE_URL = "https://tcsltucypjnrwlsyjdpt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__GqkUxudxGYIuQQo55m1XQ_076XMYyi";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type StatusAdvogado =
  | ""
  | "Ok"
  | "Não enviado"
  | "Enviado - Aguardando Retorno";

export const STATUS_OPTIONS: StatusAdvogado[] = [
  "",
  "Ok",
  "Não enviado",
  "Enviado - Aguardando Retorno",
];

export interface Tribunal {
  id: string;
  nome: string;
  sigla: string | null;
  created_at: string;
}

export interface Advogado {
  id: string;
  tribunal_id: string;
  nome: string;
  status: StatusAdvogado;
  created_at: string;
}