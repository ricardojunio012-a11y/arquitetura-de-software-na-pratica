-- Uma tabela compartilhada por todos os condomínios, separados pela coluna
-- condominio_id. Roda com o usuário administrador do banco.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- O papel da aplicação: não é dono das tabelas nem superusuário, e por isso as
-- políticas de RLS valem para ele
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_morada') THEN
    CREATE ROLE app_morada LOGIN PASSWORD 'app_morada';
  END IF;
END
$$;
GRANT USAGE ON SCHEMA public TO app_morada;

CREATE TABLE cobrancas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  condominio_id integer NOT NULL,
  unidade text NOT NULL,
  morador text NOT NULL,
  valor_centavos integer NOT NULL,
  situacao text NOT NULL
);
GRANT SELECT, INSERT ON cobrancas TO app_morada;

INSERT INTO cobrancas (condominio_id, unidade, morador, valor_centavos, situacao) VALUES
  (12, '101', 'Ana Ribeiro', 45000, 'aberta'),
  (12, '102', 'Bruno Lima', 45000, 'paga'),
  (12, '204', 'Carla Nunes', 52000, 'aberta'),
  (15, '11', 'Davi Rocha', 38000, 'aberta'),
  (15, '12', 'Elisa Prado', 38000, 'aberta'),
  (20, 'A-3', 'Fábio Costa', 61000, 'aberta'),
  (20, 'A-4', 'Gina Alves', 61000, 'paga');

-- Quem administra cada condomínio. Uma administradora tem vários condomínios, e o
-- vínculo muda com os contratos: por isso fica numa tabela, e não no código
CREATE TABLE administracoes (
  administradora_id integer NOT NULL,
  condominio_id integer NOT NULL,
  PRIMARY KEY (administradora_id, condominio_id)
);
GRANT SELECT ON administracoes TO app_morada;

INSERT INTO administracoes (administradora_id, condominio_id) VALUES
  (3, 12),
  (3, 15),
  (4, 20);
