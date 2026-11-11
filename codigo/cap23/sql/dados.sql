-- As cobranças de um condomínio e a consulta pesada do painel financeiro. O
-- pg_sleep imita uma consulta de 200 ms sobre milhões de linhas, sem precisar de
-- milhões de linhas no laboratório.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE cobrancas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  condominio_id integer NOT NULL,
  valor_centavos integer NOT NULL,
  situacao text NOT NULL
);

INSERT INTO cobrancas (condominio_id, valor_centavos, situacao)
SELECT 12, 45000, CASE WHEN n % 10 = 0 THEN 'aberta' ELSE 'paga' END
FROM generate_series(1, 120) AS n;

CREATE FUNCTION painel_financeiro(cond integer)
RETURNS TABLE (recebido_centavos bigint, em_aberto_centavos bigint)
LANGUAGE sql AS $$
  SELECT
    (SELECT sum(valor_centavos) FROM cobrancas, pg_sleep(0.2)
      WHERE condominio_id = cond AND situacao = 'paga'),
    (SELECT sum(valor_centavos) FROM cobrancas
      WHERE condominio_id = cond AND situacao = 'aberta')
$$;
