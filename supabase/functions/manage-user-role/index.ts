import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RequestBody = { userId?: string; action?: "promote" | "demote" };

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
    data: { user: callerUser },
  } = await callerClient.auth.getUser();
  if (!callerUser) return new Response("Não autorizado", { status: 401, headers: corsHeaders });

  const { data: callerRole } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerUser.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!callerRole) return new Response("Sem permissão", { status: 403, headers: corsHeaders });

  const { userId, action } = (await request.json()) as RequestBody;
  if (!userId || (action !== "promote" && action !== "demote")) {
    return new Response("Dados inválidos", { status: 400, headers: corsHeaders });
  }

  // Impede que um admin remova a própria permissão de admin, o que poderia
  // deixar o sistema sem nenhum administrador se for o único.
  if (action === "demote" && userId === callerUser.id) {
    return new Response("Você não pode remover sua própria permissão de administrador", {
      status: 409,
      headers: corsHeaders,
    });
  }

  const { data: targetUser, error: getUserError } =
    await adminClient.auth.admin.getUserById(userId);
  if (getUserError || !targetUser?.user) {
    return new Response("Usuário não encontrado", { status: 404, headers: corsHeaders });
  }

  if (action === "promote") {
    const { error: insertError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (insertError) {
      return new Response(insertError.message, { status: 500, headers: corsHeaders });
    }
  } else {
    // Impede remover o último administrador do sistema, o que travaria o
    // acesso à aba de Permissões para sempre.
    const { count, error: countError } = await adminClient
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) {
      return new Response(countError.message, { status: 500, headers: corsHeaders });
    }
    if ((count ?? 0) <= 1) {
      return new Response("Não é possível remover o último administrador do sistema", {
        status: 409,
        headers: corsHeaders,
      });
    }

    const { error: deleteError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");
    if (deleteError) {
      return new Response(deleteError.message, { status: 500, headers: corsHeaders });
    }
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
});
