-- Impede múltiplas solicitações de acesso pendentes para o mesmo e-mail.
-- Índice único parcial: só se aplica enquanto status = 'pending', então
-- depois de aprovada/recusada a pessoa pode solicitar de novo se precisar.
create unique index if not exists access_requests_pending_email_unique
  on public.access_requests (lower(email))
  where status = 'pending';
