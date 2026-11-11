-- Cobranças de todos os condomínios do Morada.
CREATE TABLE cobrancas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  condominio_id integer NOT NULL,
  unidade text NOT NULL,
  vencimento date NOT NULL,
  valor_centavos integer NOT NULL,
  situacao text NOT NULL CHECK (situacao IN ('aberta', 'paga'))
);
