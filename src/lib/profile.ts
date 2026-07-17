import { supabase } from "@/lib/supabase";

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };
type AccessRequestRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: AccessRequest["status"];
  created_at: string;
};

const PROFILE_FALLBACK_KEY = "controle-logins-profile-v2";

function removeLegacyLocalData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("controle-logins-access-requests");
  window.localStorage.removeItem("controle-logins-profile");
}

function isMissingRemoteTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.message?.includes("profiles") === true
  );
}

function getFallbackProfile(input: {
  id: string;
  email?: string | null;
  fallbackName?: string | null;
}): UserProfileData {
  if (typeof window === "undefined") {
    return {
      id: input.id,
      name: input.fallbackName || "",
      email: input.email || "",
      photoUrl: null,
    };
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(PROFILE_FALLBACK_KEY) ?? "null");
    if (
      stored &&
      typeof stored === "object" &&
      typeof stored.id === "string" &&
      typeof stored.name === "string" &&
      typeof stored.email === "string"
    ) {
      return {
        id: input.id,
        name: stored.name || input.fallbackName || "",
        email: input.email || stored.email || "",
        photoUrl: typeof stored.photoUrl === "string" ? stored.photoUrl : null,
      };
    }
  } catch {
    // ignore invalid JSON
  }

  return {
    id: input.id,
    name: input.fallbackName || "",
    email: input.email || "",
    photoUrl: null,
  };
}

type ProfileFallbackData = Pick<UserProfileData, "id" | "name" | "photoUrl"> & {
  email?: string | null;
};

function saveFallbackProfile(profile: ProfileFallbackData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_FALLBACK_KEY, JSON.stringify(profile));
}

export async function getProfile(input: {
  id: string;
  email?: string | null;
  fallbackName?: string | null;
}): Promise<UserProfileData> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url")
    .eq("id", input.id)
    .maybeSingle();
  if (error) {
    if (isMissingRemoteTable(error)) {
      console.warn(
        "Tabela 'profiles' inacessível/ausente; usando fallback local. Isso não deveria acontecer em produção.",
        error,
      );
      return getFallbackProfile(input);
    }
    throw error;
  }
  const row = data as ProfileRow | null;
  const profile = {
    id: input.id,
    name: row?.display_name || input.fallbackName || "",
    email: input.email || "",
    photoUrl: row?.avatar_url || null,
  };
  saveFallbackProfile(profile);
  return profile;
}

export async function saveProfile(profile: Pick<UserProfileData, "id" | "name" | "photoUrl">) {
  const { error } = await supabase.from("profiles").upsert({
    id: profile.id,
    display_name: profile.name.trim(),
    avatar_url: profile.photoUrl,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (isMissingRemoteTable(error)) {
      console.warn(
        "Tabela 'profiles' inacessível/ausente; salvando só localmente. Isso não deveria acontecer em produção.",
        error,
      );
      saveFallbackProfile({
        id: profile.id,
        name: profile.name.trim(),
        photoUrl: profile.photoUrl,
      });
      return;
    }
    throw error;
  }
  saveFallbackProfile({
    id: profile.id,
    name: profile.name.trim(),
    photoUrl: profile.photoUrl,
  });
}

export async function createAccessRequest(input: {
  name: string;
  email: string;
  message: string;
}): Promise<AccessRequest> {
  removeLegacyLocalData();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const message = input.message.trim();
  // Não encadeamos .select() aqui: quem envia essa solicitação ainda não
  // tem conta (é anônimo), e a política de leitura de access_requests é
  // restrita a admins. Pedir o retorno da linha inserida faria o Supabase
  // tentar reler o registro com um papel que não tem permissão de SELECT,
  // resultando em erro de RLS mesmo com o INSERT tendo sido permitido.
  const { error } = await supabase.from("access_requests").insert({ name, email, message });
  if (error) throw error;
  return {
    id: crypto.randomUUID(),
    name,
    email,
    message,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  const { data, error } = await supabase
    .from("access_requests")
    .select("id,name,email,message,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AccessRequestRow[]).map(toAccessRequest);
}

export async function decideAccessRequest(id: string, decision: "approved" | "rejected") {
  const { data, error } = await supabase.functions.invoke("approve-access-request", {
    body: { requestId: id, decision },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error("Não foi possível processar a solicitação.");
}

function toAccessRequest(row: AccessRequestRow): AccessRequest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}
