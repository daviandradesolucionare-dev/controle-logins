import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Heart, X, AlertTriangle, Frown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  GIF_CATEGORIES,
  isGifFavorite,
  listFavoriteGifs,
  listRecentGifs,
  searchGifs,
  toggleFavoriteGif,
  trendingGifs,
  type Gif,
} from "@/lib/gifs";
import { toast } from "sonner";

type Mode = "trending" | "search" | "category" | "favorites" | "recents";

interface GifExplorerProps {
  onSelect: (gif: Gif) => void;
  selecting: boolean;
}

export function GifExplorer({ onSelect, selecting }: GifExplorerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mode, setMode] = useState<Mode>("trending");
  const [activeCategoryQuery, setActiveCategoryQuery] = useState<string | null>(null);

  const [gifs, setGifs] = useState<Gif[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [previewGif, setPreviewGif] = useState<Gif | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  // Debounce da busca (~300ms) — evita disparar uma requisição a cada tecla.
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery) {
      setMode("search");
      setActiveCategoryQuery(null);
    } else if (mode === "search") {
      setMode("trending");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Carrega favoritos uma vez para saber quais corações já ficam preenchidos.
  useEffect(() => {
    listFavoriteGifs()
      .then((favs) => setFavoriteIds(new Set(favs.map((f) => f.gifId))))
      .catch(() => undefined);
  }, []);

  const loadPage = async (reset: boolean) => {
    const myRequestId = ++requestIdRef.current;
    if (reset) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      if (mode === "favorites" || mode === "recents") {
        const saved = mode === "favorites" ? await listFavoriteGifs() : await listRecentGifs();
        if (myRequestId !== requestIdRef.current) return;
        setGifs(
          saved.map((f) => ({
            id: f.gifId,
            title: f.title,
            url: f.gifUrl,
            previewUrl: f.previewUrl,
            width: 0,
            height: 0,
          })),
        );
        setNextCursor(null);
        return;
      }

      const cursor = reset ? undefined : (nextCursor ?? undefined);
      const page =
        mode === "search"
          ? await searchGifs(debouncedQuery, cursor)
          : mode === "category" && activeCategoryQuery
            ? await searchGifs(activeCategoryQuery, cursor)
            : await trendingGifs(cursor);

      if (myRequestId !== requestIdRef.current) return;
      setGifs((prev) => (reset ? page.results : [...prev, ...page.results]));
      setNextCursor(page.next);
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return;
      setError((err as Error).message);
    } finally {
      if (myRequestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    void loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeCategoryQuery, debouncedQuery]);

  // Scroll infinito: observa um marcador no fim da grade.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loading && !loadingMore) {
          void loadPage(false);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, loading, loadingMore]);

  const handleCategoryClick = (categoryQuery: string | null) => {
    setQuery("");
    setDebouncedQuery("");
    if (categoryQuery === null) {
      setMode("trending");
      setActiveCategoryQuery(null);
    } else {
      setMode("category");
      setActiveCategoryQuery(categoryQuery);
    }
  };

  const handleToggleFavorite = async (gif: Gif, event: React.MouseEvent) => {
    event.stopPropagation();
    const currentlyFavorite = favoriteIds.has(gif.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (currentlyFavorite) next.delete(gif.id);
      else next.add(gif.id);
      return next;
    });
    try {
      await toggleFavoriteGif(gif, currentlyFavorite);
      if (mode === "favorites") void loadPage(true);
    } catch (err) {
      // reverte em caso de erro
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (currentlyFavorite) next.add(gif.id);
        else next.delete(gif.id);
        return next;
      });
      toast.error("Não foi possível atualizar favorito: " + (err as Error).message);
    }
  };

  type Chip = { label: string; emoji: string; mode?: Mode; query?: string | null };
  const chips: Chip[] = useMemo(
    () => [
      { label: "Favoritos", emoji: "⭐", mode: "favorites" },
      { label: "Recentes", emoji: "🕐", mode: "recents" },
      ...GIF_CATEGORIES.map((c) => ({ label: c.label, emoji: c.emoji, query: c.query })),
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar GIFs"
          className="pl-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!debouncedQuery && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => {
            const isActive =
              "mode" in chip && chip.mode
                ? mode === chip.mode
                : mode === "category" && activeCategoryQuery === chip.query;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() =>
                  "mode" in chip && chip.mode
                    ? (setQuery(""), setDebouncedQuery(""), setMode(chip.mode))
                    : handleCategoryClick(chip.query ?? null)
                }
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span>{chip.emoji}</span>
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Não foi possível carregar os GIFs.</p>
            <Button size="sm" variant="outline" onClick={() => loadPage(true)}>
              Tentar novamente
            </Button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
            <Frown className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum GIF encontrado.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => setPreviewGif(gif)}
                  className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/40 transition-all duration-200 hover:scale-[1.03] hover:border-primary hover:shadow-md"
                >
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(gif, e)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1.5 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    aria-label="Favoritar"
                  >
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5",
                        favoriteIds.has(gif.id) ? "fill-red-500 text-red-500" : "text-white",
                      )}
                    />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-xs font-medium text-white">Selecionar</span>
                  </div>
                </button>
              ))}
            </div>
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!previewGif} onOpenChange={(open) => !open && setPreviewGif(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate">{previewGif?.title || "GIF"}</DialogTitle>
          </DialogHeader>
          {previewGif && (
            <img
              src={previewGif.url}
              alt={previewGif.title}
              className="max-h-[50vh] w-full rounded-md object-contain"
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewGif(null)}>
              Cancelar
            </Button>
            <Button
              disabled={selecting}
              onClick={() => {
                if (previewGif) onSelect(previewGif);
              }}
            >
              {selecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Selecionar GIF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
