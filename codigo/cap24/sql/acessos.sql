-- Os acessos da portaria, particionados por mês. Cada partição é uma tabela de
-- verdade; a tabela-mãe só encaminha as linhas para a partição certa.
DROP TABLE IF EXISTS acessos;
CREATE TABLE acessos (
  condominio_id integer NOT NULL,
  entrada timestamptz NOT NULL,
  placa text NOT NULL
) PARTITION BY RANGE (entrada);

CREATE TABLE acessos_2026_05 PARTITION OF acessos
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE acessos_2026_06 PARTITION OF acessos
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE acessos_2026_07 PARTITION OF acessos
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE acessos_2026_08 PARTITION OF acessos
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE acessos_2026_09 PARTITION OF acessos
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE acessos_2026_10 PARTITION OF acessos
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE INDEX ON acessos (condominio_id, entrada);

-- Um acesso a cada 10 minutos, em 20 condomínios, de maio a outubro
INSERT INTO acessos
SELECT c, t, 'ABC' || lpad((c * 7)::text, 4, '0')
FROM generate_series(1, 20) AS c,
     generate_series('2026-05-01'::timestamptz, '2026-10-31 23:50', '10 minutes') AS t;
ANALYZE acessos;
