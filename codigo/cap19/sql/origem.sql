-- O banco transacional do Morada, com dados fictícios gerados de forma determinística:
-- 40 condomínios, um morador por unidade, um veículo para cada três moradores e seis
-- meses de cobranças. CPFs e placas têm o formato certo, mas não são de ninguém.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE condominios (
  id integer PRIMARY KEY,
  nome text NOT NULL,
  uf char(2) NOT NULL,
  unidades integer NOT NULL
);

CREATE TABLE moradores (
  id integer PRIMARY KEY,
  condominio_id integer NOT NULL REFERENCES condominios,
  nome text NOT NULL,
  cpf char(11) NOT NULL
);

CREATE TABLE veiculos (
  placa char(7) PRIMARY KEY,
  morador_id integer NOT NULL REFERENCES moradores
);

CREATE TABLE cobrancas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  condominio_id integer NOT NULL REFERENCES condominios,
  morador_id integer NOT NULL REFERENCES moradores,
  vencimento date NOT NULL,
  valor_centavos integer NOT NULL,
  situacao text NOT NULL
);

INSERT INTO condominios
SELECT
  c,
  'Residencial ' || c,
  (ARRAY['SP','RJ','MG','PR','RS','BA','PE','CE','GO','DF','AM','PA'])[1 + c % 12],
  20 + (c * 37) % 230
FROM generate_series(1, 40) AS c;

-- Um morador por unidade, numerados em sequência
INSERT INTO moradores
SELECT
  row_number() OVER (ORDER BY c.id, u),
  c.id,
  'Morador ' || c.id || '-' || u,
  lpad(((c.id * 100000 + u)::bigint * 7919 % 99999999999)::text, 11, '0')
FROM condominios c, generate_series(1, c.unidades) AS u;

INSERT INTO veiculos
SELECT
  chr(65 + m.id % 26) || chr(65 + (m.id / 26) % 26) || chr(65 + (m.id / 676) % 26)
    || (m.id % 10) || chr(65 + (m.id / 7) % 26) || lpad((m.id % 100)::text, 2, '0'),
  m.id
FROM moradores m
WHERE m.id % 3 = 0;

-- Seis meses de cobranças. A inadimplência varia por condomínio, de 4% a 22%
INSERT INTO cobrancas (condominio_id, morador_id, vencimento, valor_centavos, situacao)
SELECT
  m.condominio_id,
  m.id,
  make_date(2026, mes, 10),
  30000 + m.condominio_id * 1000,
  CASE WHEN (m.id * 31 + mes * 17) % 100 < 4 + (m.condominio_id * 7) % 19
    THEN 'aberta' ELSE 'paga' END
FROM moradores m, generate_series(4, 9) AS mes;

-- Um defeito de origem: três cobranças gravadas com valor zero por uma importação
UPDATE cobrancas SET valor_centavos = 0 WHERE id IN (101, 2002, 20003);
