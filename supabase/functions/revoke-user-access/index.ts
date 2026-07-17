import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RequestBody = { requestId?: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Duração de banimento efetivamente permanente (Supabase não tem um valor
// literal "para sempre"; usar uma janela bem longa é a prática recomendada).
const PERMANENT_BAN_DURATION = "876000h";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return new Response("Não autorizado", { status: 401, headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(url, serviceKey);

  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) return new Response("Não autorizado", { status: 401, headers: corsHeaders });

  const { data: role } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return new Response("Sem permissão", { status: 403, headers: corsHeaders });

  const { requestId } = (await request.json()) as RequestBody;
  if (!requestId) return new Response("Dados inválidos", { status: 400, headers: corsHeaders });

  const { data: accessRequest, error: requestError } = await adminClient
    .from("access_requests")
    .select("id, email, status")
    .eq("id", requestId)
    .single();
  if (requestError || !accessRequest)
    return new Response("Solicitação não encontrada", { status: 404, headers: corsHeaders });
  if (accessRequest.status !== "approved")
    return new Response("Essa solicitação nunca foi aprovada", {
      status: 409,
      headers: corsHeaders,
    });

  // Não se pode revogar o próprio acesso por essa rota (evita o admin se
  // trancar para fora acidentalmente).
  if (accessRequest.email.toLowerCase() === caller.email?.toLowerCase()) {
    return new Response("Você não pode revogar seu próprio acesso.", {
      status: 400,
      headers: corsHeaders,
    });
  }

  // A API admin não tem "buscar por e-mail" direto; paginamos a listagem
  // até achar o usuário. Bases pequenas (o caso de uso aqui) resolvem em
  // uma única página.
  let targetUserId: string | null = null;
  for (let page = 1; page <= 20 && !targetUserId; page++) {
    const { data: usersPage, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listError) return new Response(listError.message, { status: 500, headers: corsHeaders });
    const match = usersPage.users.find(
      (u) => u.email?.toLowerCase() === accessRequest.email.toLowerCase(),
    );
    if (match) targetUserId = match.id;
    if (usersPage.users.length < 200) break;
  }

  if (!targetUserId) {
    return new Response("Usuário não encontrado (talvez nunca tenha aceitado o convite).", {
      status: 404,
      headers: corsHeaders,
    });
  }

  const { error: banError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    ban_duration: PERMANENT_BAN_DURATION,
  });
  if (banError) return new Response(banError.message, { status: 500, headers: corsHeaders });

  const { error: updateError } = await adminClient
    .from("access_requests")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) return new Response(updateError.message, { status: 500, headers: corsHeaders });

  return Response.json({ ok: true }, { headers: corsHeaders });
});
