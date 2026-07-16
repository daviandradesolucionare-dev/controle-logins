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

function removeLegacyLocalData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("controle-logins-access-requests");
  window.localStorage.removeItem("controle-logins-profile");
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
  if (error) throw error;
  const row = data as ProfileRow | null;
  return {
    id: input.id,
    name: row?.display_name || input.fallbackName || "",
    email: input.email || "",
    photoUrl: row?.avatar_url || null,
  };
}

export async function saveProfile(profile: Pick<UserProfileData, "id" | "name" | "photoUrl">) {
  const { error } = await supabase.from("profiles").upsert({
    id: profile.id,
    display_name: profile.name.trim(),
    avatar_url: profile.photoUrl,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function createAccessRequest(input: {
  name: string;
  email: string;
  message: string;
}): Promise<AccessRequest> {
  removeLegacyLocalData();
  const { data, error } = await supabase
    .from("access_requests")
    .insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      message: input.message.trim(),
    })
    .select("id,name,email,message,status,created_at")
    .single();
  if (error) throw error;
  return toAccessRequest(data as AccessRequestRow);
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
