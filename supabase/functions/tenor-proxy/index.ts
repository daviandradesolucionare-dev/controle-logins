// Proxy para a API do Tenor. A chave (TENOR_API_KEY) fica só aqui no
// servidor — nunca é exposta ao navegador. O front-end chama esta função
// via supabase.functions.invoke, nunca a API do Tenor diretamente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "search" | "trending";
type RequestBody = { action?: Action; query?: string; pos?: string; limit?: number };

type TenorMediaFormat = { url: string; dims: [number, number] };
type TenorResult = {
  id: string;
  content_description?: string;
  media_formats: {
    gif?: TenorMediaFormat;
    tinygif?: TenorMediaFormat;
    nanogif?: TenorMediaFormat;
  };
};
type TenorResponse = { results: TenorResult[]; next?: string };

export type GifResult = {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
};

function mapResults(results: TenorResult[]): GifResult[] {
  return results
    .filter((item) => item.media_formats?.gif)
    .map((item) => {
      const gif = item.media_formats.gif!;
      const preview = item.media_formats.tinygif ?? item.media_formats.nanogif ?? gif;
      return {
        id: item.id,
        title: item.content_description ?? "",
        url: gif.url,
        previewUrl: preview.url,
        width: gif.dims[0],
        height: gif.dims[1],
      };
    });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return new Response("Não autorizado", { status: 401, headers: corsHeaders });

  const apiKey = Deno.env.get("TENOR_API_KEY");
  if (!apiKey) {
    return new Response(
      "TENOR_API_KEY não configurada. Rode: supabase secrets set TENOR_API_KEY=... --project-ref <PROJECT_REF>",
      { status: 500, headers: corsHeaders },
    );
  }

  const { action, query, pos, limit } = (await request.json()) as RequestBody;
  const safeLimit = Math.min(Math.max(limit ?? 24, 1), 50);

  let tenorUrl: URL;
  if (action === "search") {
    if (!query || !query.trim()) {
      return new Response("Parâmetro 'query' é obrigatório para busca", {
        status: 400,
        headers: corsHeaders,
      });
    }
    tenorUrl = new URL("https://tenor.googleapis.com/v2/search");
    tenorUrl.searchParams.set("q", query.trim());
  } else if (action === "trending") {
    tenorUrl = new URL("https://tenor.googleapis.com/v2/featured");
  } else {
    return new Response("Parâmetro 'action' inválido (use 'search' ou 'trending')", {
      status: 400,
      headers: corsHeaders,
    });
  }

  tenorUrl.searchParams.set("key", apiKey);
  tenorUrl.searchParams.set("client_key", "controle_logins");
  tenorUrl.searchParams.set("limit", String(safeLimit));
  tenorUrl.searchParams.set("media_filter", "gif,tinygif,nanogif");
  tenorUrl.searchParams.set("contentfilter", "medium");
  if (pos) tenorUrl.searchParams.set("pos", pos);

  const tenorResponse = await fetch(tenorUrl);
  if (!tenorResponse.ok) {
    const body = await tenorResponse.text();
    return new Response("Erro ao consultar a API do Tenor: " + body, {
      status: 502,
      headers: corsHeaders,
    });
  }

  const data = (await tenorResponse.json()) as TenorResponse;
  return Response.json(
    { results: mapResults(data.results), next: data.next || null },
    { headers: corsHeaders },
  );
});
