import { supabase } from "@/lib/supabase";

export interface Gif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

export interface GifPage {
  results: Gif[];
  next: string | null;
}

export const GIF_CATEGORIES = [
  { label: "Em Alta", emoji: "🔥", query: null },
  { label: "Memes", emoji: "😂", query: "memes" },
  { label: "Love", emoji: "❤️", query: "love" },
  { label: "Games", emoji: "🎮", query: "games" },
  { label: "Anime", emoji: "🎌", query: "anime" },
  { label: "Animais", emoji: "🐱", query: "animais" },
  { label: "Esportes", emoji: "⚽", query: "esportes" },
  { label: "Carros", emoji: "🚗", query: "carros" },
  { label: "Música", emoji: "🎵", query: "música" },
  { label: "Filmes", emoji: "🎬", query: "filmes" },
  { label: "Tecnologia", emoji: "💻", query: "tecnologia" },
  { label: "Reações", emoji: "✨", query: "reações" },
] as const;

async function invokeTenor(body: Record<string, unknown>): Promise<GifPage> {
  const { data, error } = await supabase.functions.invoke("tenor-proxy", { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = await ctx.clone().text();
    } catch {
      // mantém a mensagem original se não conseguir ler o corpo
    }
    throw new Error(message);
  }
  return data as GifPage;
}

// Cache simples em memória por sessão: buscar o mesmo termo de novo não
// dispara uma nova chamada à API do Tenor.
const searchCache = new Map<string, GifPage>();

export async function searchGifs(query: string, pos?: string): Promise<GifPage> {
  const cacheKey = `${query.trim().toLowerCase()}::${pos ?? ""}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;
  const page = await invokeTenor({ action: "search", query, pos });
  searchCache.set(cacheKey, page);
  return page;
}

export async function trendingGifs(pos?: string): Promise<GifPage> {
  const cacheKey = `__trending__::${pos ?? ""}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;
  const page = await invokeTenor({ action: "trending", pos });
  searchCache.set(cacheKey, page);
  return page;
}

export interface SavedGif {
  gifId: string;
  gifUrl: string;
  previewUrl: string;
  title: string;
}

export async function listFavoriteGifs(): Promise<SavedGif[]> {
  const { data, error } = await supabase
    .from("gif_favorites")
    .select("gif_id,gif_url,preview_url,title")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    gifId: row.gif_id,
    gifUrl: row.gif_url,
    previewUrl: row.preview_url,
    title: row.title,
  }));
}

export async function isGifFavorite(gifId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("gif_favorites")
    .select("id")
    .eq("gif_id", gifId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function toggleFavoriteGif(gif: Gif, currentlyFavorite: boolean): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Usuário não autenticado.");

  if (currentlyFavorite) {
    const { error } = await supabase
      .from("gif_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("gif_id", gif.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("gif_favorites").insert({
    user_id: userId,
    gif_id: gif.id,
    gif_url: gif.url,
    preview_url: gif.previewUrl,
    title: gif.title,
  });
  if (error) throw error;
  return true;
}

export async function listRecentGifs(): Promise<SavedGif[]> {
  const { data, error } = await supabase
    .from("gif_recents")
    .select("gif_id,gif_url,preview_url,title")
    .order("used_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    gifId: row.gif_id,
    gifUrl: row.gif_url,
    previewUrl: row.preview_url,
    title: row.title,
  }));
}

export async function recordRecentGif(gif: Gif): Promise<void> {
  const { error } = await supabase.rpc("record_gif_recent", {
    p_gif_id: gif.id,
    p_gif_url: gif.url,
    p_preview_url: gif.previewUrl,
    p_title: gif.title,
  });
  if (error) throw error;
}
