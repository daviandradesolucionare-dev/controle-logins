import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Moon, Sun, Scale, Wifi, WifiOff, LogOut, Settings, User as UserIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type UserProfileData } from "@/lib/profile";
import { useProfileQuery } from "@/lib/use-profile-query";
import { cn } from "@/lib/utils";

function ConnectionBadge() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { error } = await supabase
          .from("tabelas_tribunais")
          .select("id", { count: "exact", head: true });
        if (!cancelled) setStatus(error ? "offline" : "online");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const label =
    status === "online" ? "Conectado" : status === "offline" ? "Sem conexão" : "Verificando...";
  const Icon = status === "offline" ? WifiOff : Wifi;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "online" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "offline" && "border-destructive/30 bg-destructive/10 text-destructive",
        status === "checking" && "border-muted-foreground/30 bg-muted text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

export function AppNav() {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profileData } = useProfileQuery(user);
  const profile: Pick<UserProfileData, "name" | "photoUrl"> = profileData
    ? { name: profileData.name, photoUrl: profileData.photoUrl }
    : { name: user?.user_metadata?.full_name || "", photoUrl: null };

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Scale className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Controle de Distribuição</span>
          <span className="sm:hidden">CD</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Dashboard
          </Link>
          <Link
            to="/tribunais"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Tribunais
          </Link>
          <Link
            to="/novo-cadastro"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Novo Cadastro
          </Link>
          <Link
            to="/advogados-padrao"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Advogados Padrão
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <ConnectionBadge />
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center rounded-full border border-border/70 bg-background/80 p-1 shadow-sm transition-colors hover:bg-accent"
                    aria-label="Abrir configurações"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={profile.photoUrl ?? undefined}
                        alt={profile.name || user.email || "Usuário"}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile.name ? (
                          profile.name.charAt(0).toUpperCase()
                        ) : (
                          <UserIcon className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium">{profile.name || user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/configuracoes"
                      className="flex w-full cursor-pointer items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
