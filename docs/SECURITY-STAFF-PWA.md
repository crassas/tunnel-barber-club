# TUNNEL STAFF — Estado verificado em 28/10/2026

## Encontrado
- GitHub `main`: website estático, seleção de serviço e barbeiro; pedido via WhatsApp, **não** cria reserva na Neon.
- Neon: projeto **tunnel-barberclub** (PostgreSQL 18, região UE), branch production.
- Estrutura **já existente**: `appointments`, `barbers`, `calendar_hours`, `calendar_services`, `managers`, `technicians`, `conversations`, `messages`, `customer_reviews` e esquema `neon_auth`.
- `appointments` já protege conflitos via EXCLUDE GiST por barbeiro e intervalo quando status <> cancelled e tem idempotência UNIQUE(created_by,request_id).
- `appointments.kind` suporta 'booking' e 'block'; status suporta 'confirmed','completed','cancelled'.
- `barbers.auth_user_id` liga ao utilizador autenticado; `managers.auth_user_id` identifica gestores.
- Portanto **não criar tabelas duplicadas** nem executar o SQL preliminar original.
- `staff/` contém apenas *shell PWA* instalável, com login desativado; **não é aplicação operacional**.

## Lacunas
1. Backend/API de reserva e consulta de disponibilidade, com validação de intervalos, folgas, serviços e autenticação.
2. Google OAuth/OIDC e sessão segura no servidor, associada a `neon_auth` e mapeamentos de permissões existentes; confirmar configuração real do provider.
3. PWA operacional e privada, com UI de agenda, reservas, gestão e logout.
4. Segurança: IDOR, CSRF, rate limits, CORS restrito, CSP, validação, transações, logs, testes de concorrência.
5. Domínio/subdomínio/DNS, alojamento e secret env; produção e teste ponta-a-ponta.
6. RGPD (retenção, acesso, eliminação), política de privacidade e cópias de segurança.

## Acesso
Nunca confiar no texto `barber_id` do cliente nem apenas no email Google.
Verificar token no servidor e resolver `auth_user_id` para barbeiro ativo ou gestor. Toda a consulta privada deve aplicar autorização individual.
Service worker deve limitar-se a recursos estáticos. Dados pessoais e API: Cache-Control: no-store. Não guardar tokens em localStorage.

## SQL
`db/001_initial.sql` passou a conter apenas uma inspeção read-only do esquema real.
Qualquer alteração deverá ser uma migração incremental testada numa branch isolada da Neon, após comparação com constraints e índices reais.

## Go-live
Não publicar como funcional até testar login real, sessões expiradas, acesso cruzado entre barbeiros, concorrência de reservas, cancelamentos, horário, PWA Android/iOS, segurança e rollback.
