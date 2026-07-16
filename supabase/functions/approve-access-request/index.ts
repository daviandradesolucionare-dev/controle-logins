import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RequestBody = { requestId?: string; decision?: "approved" | "rejected" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    data: { user },
  } = await callerClient.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401, headers: corsHeaders });

  const { data: role } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return new Response("Sem permissão", { status: 403, headers: corsHeaders });

  const { requestId, decision } = (await request.json()) as RequestBody;
  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    return new Response("Dados inválidos", { status: 400, headers: corsHeaders });
  }

  const { data: accessRequest, error: requestError } = await adminClient
    .from("access_requests")
    .select("id, email, name, status")
    .eq("id", requestId)
    .single();
  if (requestError || !accessRequest)
    return new Response("Solicitação não encontrada", { status: 404, headers: corsHeaders });
  if (accessRequest.status !== "pending")
    return new Response("Solicitação já processada", { status: 409, headers: corsHeaders });

  if (decision === "approved") {
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      accessRequest.email,
      {
        data: { full_name: accessRequest.name },
      },
    );
    if (inviteError)
      return new Response(inviteError.message, { status: 422, headers: corsHeaders });
  }

  const { error: updateError } = await adminClient
    .from("access_requests")
    .update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) return new Response(updateError.message, { status: 500, headers: corsHeaders });

  return Response.json({ ok: true }, { headers: corsHeaders });
});
