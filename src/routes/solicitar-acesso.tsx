import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAccessRequest } from "@/lib/profile";

export const Route = createFileRoute("/solicitar-acesso")({
  ssr: false,
  component: SolicitarAcessoPage,
});

function SolicitarAcessoPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Informe seu nome e um e-mail válido para solicitar acesso.");
      return;
    }
    if (!message.trim()) {
      toast.error("Descreva o motivo da sua solicitação.");
      return;
    }
    try {
      setSending(true);
      await createAccessRequest({ name, email, message });
      toast.success(
        "Solicitação enviada. Você receberá um convite por e-mail se ela for aprovada.",
      );
      navigate({ to: "/login" });
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "23505") {
        toast.error("Já existe uma solicitação pendente para esse e-mail. Aguarde a análise.");
      } else {
        toast.error("Não foi possível enviar a solicitação: " + err.message);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Solicitar acesso</h1>
            <p className="text-sm text-muted-foreground">
              Envie sua solicitação para que o administrador libere o usuário.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Motivo da solicitação</label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explique por que você precisa de acesso"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/login" })}>
              Cancelar
            </Button>
            <Button type="submit" disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar solicitação
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
