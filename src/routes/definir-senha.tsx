import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Scale } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  component: DefinirSenhaPage,
});

const schema = z
  .object({
    password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

/**
 * Página que recebe quem clicou no link de convite/recuperação de senha
 * enviado pelo Supabase. O supabase-js já detecta automaticamente o token
 * presente na URL (hash) e cria uma sessão temporária -- essa tela só
 * precisa aguardar essa sessão existir e então deixar a pessoa definir
 * a senha definitiva.
 */
function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    // O supabase-js processa o token da URL de forma assíncrona ao carregar
    // a página; escutamos o evento de auth em vez de checar getSession()
    // imediatamente, para não corrermos na frente desse processamento.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionReady(true);
        setCheckingSession(false);
      } else if (event === "SIGNED_OUT") {
        setCheckingSession(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      }
      setCheckingSession(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    toast.success("Senha definida com sucesso. Bem-vindo(a)!");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Controle de Distribuição</h1>
          <p className="text-sm text-muted-foreground">Defina sua senha para concluir o acesso.</p>
        </div>

        {checkingSession ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !sessionReady ? (
          <div className="space-y-3 text-center text-sm text-muted-foreground">
            <p>
              Este link é inválido ou já expirou. Solicite um novo convite ao administrador, ou faça
              login se já tiver uma senha definida.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
              Ir para o login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nova senha</label>
              <Input
                type="password"
                autoComplete="new-password"
                autoFocus
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirmar senha</label>
              <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            {serverError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Definir senha e entrar
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
