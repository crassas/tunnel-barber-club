# TUNNEL — auditoria inicial e implementação segura

## Estado verificado no GitHub (28/10/2026)
- `main` contém `index.html`, `script.js` e `package.json` de site estático.
- O fluxo actual **não** confirma reservas nem consulta disponibilidade: gera mensagem de WhatsApp.
- Não se encontrou backend, autenticação ou integração Neon nos ficheiros inspeccionados.
- **Não afirmar que a ligação Neon/PWA está pronta ou segura.**

## Arquitectura alvo
- Site público: domínio principal, reservas através de API HTTPS.
- PWA privada: `equipa.<domínio>` (configuração DNS separada, sem compra de domínio).
- Backend: endpoints públicos de disponibilidade/criação de reserva e endpoints de equipa com autenticação Google OIDC.
- Neon/PostgreSQL: apenas backend; **nunca** URL ou password no JavaScript público.

## Regras obrigatórias antes do go-live
1. OAuth Google OIDC com PKCE, state, nonce e callback restrito; verificar assinatura, issuer, audience, expiração e `sub` no servidor. Não confiar no email enviado pelo browser.
2. Autorização por Google `sub` explicitamente permitido e `staff.active=true`; papéis `barber`, `manager`, `owner`, com autorização em CADA endpoint e filtragem de recursos por barbeiro.
3. Sessão opaca criada no servidor, cookie Secure/HttpOnly/SameSite adequado, rotação, validade limitada, revogação no logout; CSRF para operações com cookies.
4. Respostas privadas: `Cache-Control: no-store`; service worker deve cachear exclusivamente assets estáticos públicos da PWA, jamais dados pessoais, API ou cookies.
5. SQL parametrizado, privilégios mínimos por função, sem DB URL no cliente. Guardar credenciais em secrets do alojamento; rotação quando necessário.
6. Proteção de bot/spam e rate limiting no endpoint público; validação de horários e capacidade no servidor.
7. Reserva atómica em transacção com protecção anti-sobreposição; validar também folgas/horário e serviço/barbeiro activo.
8. Auditoria sem dados excessivos; logs sem tokens, passwords, números de telefone ou texto livre de clientes.
9. Protecções HTTP: HTTPS, CSP testada, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; CORS apenas origens específicas.
10. RGPD: política de privacidade, finalidade, retenção, apagamento e exportação; controlo de acesso e backups testados.
11. Testes de acesso não autorizado, escalada de permissões, reservas concorrentes, CSRF, XSS, sessão expirada, fugas de cache e recuperação de backup.
12. CI com npm audit / dependabot / secret scanning, revisão manual de migrações e ambientes separados.

## Migração
`db/001_initial.sql` é apenas ponto de partida, **não foi executado**.
Não aplicar sem confirmar o esquema existente na Neon; ALTER/CREATE podem colidir com tabelas existentes.
É necessário ainda programar validação transaccional dos bloqueios e regras de horário, API, OAuth, PWA e testes.

## Critério de conclusão
- Cliente reserva online, vê só slots livres e recebe estado correcto;
- barbeiro autorizado instala a PWA e vê só as suas marcações;
- administrador concede e revoga acessos;
- sessão expirada não deixa abrir qualquer recurso;
- auditoria automatizada e testes manuais aprovados no ambiente de staging.
