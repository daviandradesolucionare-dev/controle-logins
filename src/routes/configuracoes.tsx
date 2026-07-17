import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Lock,
  ShieldCheck,
  UserCircle2,
  Upload,
  Check,
  X,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  decideAccessRequest,
  deleteAccessRequest,
  getAccessRequestActionState,
  listAccessRequests,
  revokeAccessRequest,
  saveProfile,
  type AccessRequest,
} from "@/lib/profile";
import { useInvalidateProfile, useProfileQuery } from "@/lib/use-profile-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/configuracoes")({
  ssr: false,
  component: ConfiguracoesPage,
});

type TabKey = "perfil" | "permissoes";

function ConfiguracoesPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("perfil");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const { data: profileData, error: profileError } = useProfileQuery(user);
  const invalidateProfile = useInvalidateProfile();

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
    }
  }, [navigate, user]);

  useEffect(() => {
    if (profileError) {
      toast.error("Não foi possível carregar o perfil: " + (profileError as Error).message);
    }
  }, [profileError]);

  // Sincroniza os campos editáveis sempre que o perfil compartilhado mudar
  // (ex: carregado pela primeira vez, ou atualizado em outra aba/componente).
  useEffect(() => {
    if (!profileData || !user) return;
    setName(profileData.name);
    setEmail(profileData.email);
    setPhotoUrl(profileData.photoUrl || user.user_metadata?.avatar_url || null);
  }, [profileData, user]);

  useEffect(() => {
    if (!isAdmin || tab !== "permissoes") return;
    listAccessRequests()
      .then(setRequests)
      .catch((error: Error) =>
        toast.error("Não foi possível carregar solicitações: " + error.message),
      );
  }, [isAdmin, tab]);

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error("Envie uma imagem PNG, JPG ou WEBP de até 5 MB.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "image";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false })
      .then(async ({ error }) => {
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        setPhotoUrl(data.publicUrl);
        // Persiste imediatamente para que a foto não se perca se o usuário
        // navegar/atualizar a página antes de clicar em "Salvar alterações".
        await saveProfile({ id: user.id, name, photoUrl: data.publicUrl });
        // Atualiza o cache compartilhado para que o header e outras telas
        // reflitam a nova foto imediatamente, sem precisar recarregar.
        await invalidateProfile(user.id);
        toast.success("Foto enviada e salva.");
      })
      .catch((error: Error) => toast.error("Não foi possível enviar a foto: " + error.message));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    if (email !== user.email) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    }

    try {
      await saveProfile({ id: user.id, name, photoUrl });
      await invalidateProfile(user.id);
    } catch (error) {
      setSaving(false);
      toast.error("Não foi possível salvar o perfil: " + (error as Error).message);
      return;
    }

    if (currentPassword && newPassword) {
      if (newPassword.length < 6) {
        setSaving(false);
        toast.error("A nova senha precisa ter ao menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setSaving(false);
        toast.error("As senhas novas não coincidem.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email ?? email,
        password: currentPassword,
      });
      if (error) {
        setSaving(false);
        toast.error("Senha atual incorreta.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setSaving(false);
        toast.error(updateError.message);
        return;
      }
    }

    setSaving(false);
    toast.success("Perfil atualizado.");
  };

  const handleRequestDecision = async (id: string, decision: "approved" | "rejected") => {
    try {
      await decideAccessRequest(id, decision);
      setRequests(await listAccessRequests());
      toast.success(
        decision === "approved" ? "Convite enviado por e-mail." : "Solicitação recusada.",
      );
    } catch (error) {
      toast.error("Não foi possível processar: " + (error as Error).message);
    }
  };

  const handleRevokeAccess = async (id: string) => {
    try {
      await revokeAccessRequest(id);
      setRequests(await listAccessRequests());
      toast.success("Acesso revogado com sucesso.");
    } catch (error) {
      toast.error("Não foi possível revogar o acesso: " + (error as Error).message);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteAccessRequest(id);
      setRequests((prev) => prev.filter((item) => item.id !== id));
      toast.success("Solicitação removida.");
    } catch (error) {
      toast.error("Não foi possível excluir a solicitação: " + (error as Error).message);
    }
  };

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "pending").length,
    [requests],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seu perfil, segurança e permissões de acesso.
          </p>
        </div>
        {isAdmin && (
          <div className="rounded-full border bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="permissoes">Permissões</TabsTrigger>}
        </TabsList>

        <TabsContent value="perfil">
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border bg-muted/50">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle2 className="h-14 w-14 text-muted-foreground" />
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  <span>Enviar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
                <p className="mt-3 text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nome</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">E-mail</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>Alterar senha</AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <Input
                      type="password"
                      placeholder="Senha atual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Confirmar nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar alterações
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="permissoes">
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Solicitações de acesso</h2>
              </div>

              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma solicitação pendente no momento.
                </p>
              ) : (
                <div className="space-y-3">
                  {requests.map((item) => {
                    const actionState = getAccessRequestActionState(item);
                    return (
                      <div key={item.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.email}</p>
                            {item.message && <p className="mt-2 text-sm">{item.message}</p>}
                          </div>
                          <div className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {item.status}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {actionState.canApprove && (
                            <Button
                              size="sm"
                              onClick={() => handleRequestDecision(item.id, "approved")}
                            >
                              <Check className="mr-1.5 h-4 w-4" /> Aceitar
                            </Button>
                          )}
                          {actionState.canReject && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestDecision(item.id, "rejected")}
                            >
                              <X className="mr-1.5 h-4 w-4" /> Recusar
                            </Button>
                          )}
                          {actionState.canRevoke && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeAccess(item.id)}
                            >
                              <Undo2 className="mr-1.5 h-4 w-4" /> Revogar acesso
                            </Button>
                          )}
                          {actionState.canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteRequest(item.id)}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
