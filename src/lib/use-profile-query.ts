import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getProfile, type UserProfileData } from "@/lib/profile";
import type { User } from "@supabase/supabase-js";

export function profileQueryKey(userId: string | undefined) {
  return ["profile", userId] as const;
}

/**
 * Busca o perfil (nome/avatar) do usuário através do cache compartilhado do
 * TanStack Query. Qualquer componente que use este hook para o mesmo user.id
 * reflete automaticamente uma atualização feita em qualquer outro lugar do
 * app (ex: header e tela de Configurações), desde que os dois invalidem/
 * atualizem a mesma queryKey após salvar. Ver `useInvalidateProfile`.
 */
export function useProfileQuery(user: User | null) {
  return useQuery<UserProfileData | null>({
    queryKey: profileQueryKey(user?.id),
    queryFn: () =>
      user
        ? getProfile({
            id: user.id,
            email: user.email,
            fallbackName: user.user_metadata?.full_name,
          })
        : Promise.resolve(null),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return (userId: string | undefined) =>
    queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
}
