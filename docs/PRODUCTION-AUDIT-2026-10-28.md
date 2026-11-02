# TUNNEL — Auditoria de pré-produção (28-10-2026)

## Decisão: NO-GO para PWA da equipa
Verificação por consultas de leitura a Vercel e Neon.

### Confirmado
- Vercel deployment de `tunnel-barberclub` com estado READY.
- `tunnelbarberclub.pt` e `equipa.tunnelbarberclub.pt` associados à Vercel; DNS do subdomínio devolve misconfigured=true, sem CNAME.
- Neon projeto `tunnel-barberclub`, PostgreSQL 18; estrutura real tem appointments, barbers, calendar_hours, calendar_services, managers, technicians e neon_auth.
- RLS habilitado nas 9 tabelas de public; pg_policies devolveu ZERO políticas declaradas.
- EXCLUDE GiST impede sobreposição de appointments (status != cancelled) pelo mesmo barbeiro, UNIQUE(created_by,request_id) protege idempotência.
- Neon Auth Better Auth com provedor Google e domínios de callback adicionados.
- A branch GitHub `feature/staff-pwa-security-foundation` inclui shell PWA; o login nela está desativado intencionalmente.
- A Vercel tem uma agenda interna e API próprias; a versão publicada não foi reconciliada com a branch GitHub.

### Bloqueios obrigatórios
1. Configurar DNS no gestor da zona, confirmar propagação e TLS.
2. Confirmar qual é a fonte de código do deployment e colocar PWA por cima do backend de agenda existente; não promover o shell estático isolado.
3. Verificar autorização real de endpoints para funções técnico/gerente/barbeiro e tratamento de IDOR, roles, impersonation.
4. Validar que o role DB utilizado pela API é de privilégios mínimos e não contorna RLS por ser owner/BYPASSRLS. A ausência de políticas RLS públicas exige avaliação detalhada.
5. Testar login Google com contas reais; técnico, gerente, barbeiros; revogação e logout; JWT issuer/audience/exp e cookies; CSRF.
6. Testar reservas concorrentes, horários, bloqueios, cancelamentos e duplicados.
7. Verificar HTTP headers, rate-limit, CORS, CSP, logs e retenção RGPD.
8. Testar fluxo Android/iOS de instalação PWA; cache offline não pode guardar dados de reservas ou identidades.
9. Gerar staging e plano de rollback antes de publicar.

Não foram executadas alterações SQL de produção nesta auditoria.
