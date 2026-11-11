-- Fundo de reserva de cada condomínio. O saldo é a soma dos movimentos, que nunca são
-- alterados: uma saída é um movimento negativo.
CREATE TABLE fundos (
  id integer PRIMARY KEY,
  condominio_id integer NOT NULL
);

CREATE TABLE movimentos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fundo_id integer NOT NULL REFERENCES fundos,
  valor_centavos integer NOT NULL,
  descricao text NOT NULL
);
