-- TUNNEL — validação READ-ONLY do esquema existente (Neon project tunnel-barberclub).
-- Não executar migrações sem análise do estado real. Este ficheiro substitui
-- um esquema preliminar incompatível com as tabelas já existentes.
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('appointments','barbers','calendar_hours','calendar_services','managers','technicians')
ORDER BY table_name, ordinal_position;
