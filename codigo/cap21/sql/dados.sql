-- 20 condomínios com 120 unidades cada e um ano de cobranças, gerados de forma
-- determinística. Há índice na coluna que a rota usa: cada consulta é rápida, e o
-- problema do laboratório está no número de consultas, e não em cada uma.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE unidades (
  id integer PRIMARY KEY,
  condominio_id integer NOT NULL,
  codigo text NOT NULL
);
CREATE INDEX ON unidades (condominio_id);

CREATE TABLE cobrancas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unidade_id integer NOT NULL REFERENCES unidades,
  vencimento date NOT NULL,
  valor_centavos integer NOT NULL,
  situacao text NOT NULL
);
CREATE INDEX ON cobrancas (unidade_id);

INSERT INTO unidades
SELECT (c - 1) * 120 + u, c, 'U-' || lpad(u::text, 3, '0')
FROM generate_series(1, 20) AS c, generate_series(1, 120) AS u;

INSERT INTO cobrancas (unidade_id, vencimento, valor_centavos, situacao)
SELECT
  id,
  make_date(2026, mes, 5),
  40000 + (id % 7) * 1000,
  CASE WHEN (id * 13 + mes * 7) % 100 < 6 THEN 'aberta' ELSE 'paga' END
FROM unidades, generate_series(1, 12) AS mes;

ANALYZE;
