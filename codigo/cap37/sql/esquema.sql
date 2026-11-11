-- Esquema do laboratório do capítulo 37, recriado a cada execução.
DROP SCHEMA IF EXISTS cadastro, eventos, cofre, auditoria CASCADE;
CREATE SCHEMA cadastro;
CREATE SCHEMA eventos;
CREATE SCHEMA cofre;
CREATE SCHEMA auditoria;

-- Moradores. Na versão ingênua, nome, CPF e e-mail ficam em claro; na versão com
-- crypto-shredding, ficam cifrados com a chave do próprio titular.
CREATE TABLE cadastro.moradores (
  titular integer PRIMARY KEY,
  unidade text NOT NULL,
  nome    text NOT NULL,
  cpf     text NOT NULL,
  email   text NOT NULL
);

-- Cobranças: ficam depois da saída do morador (obrigação legal, art. 16, I),
-- ligadas à unidade e a um número de titular, sem nenhum dado pessoal legível.
CREATE TABLE cadastro.cobrancas (
  id             serial PRIMARY KEY,
  titular        integer NOT NULL,
  unidade        text NOT NULL,
  competencia    text NOT NULL,
  valor_centavos integer NOT NULL,
  paga           boolean NOT NULL
);

-- Eventos já publicados para outros módulos (como um tópico de mensagens): só
-- se acrescentam, nunca se alteram.
CREATE TABLE eventos.publicados (
  seq     serial PRIMARY KEY,
  titular integer NOT NULL,
  tipo    text NOT NULL,
  momento text NOT NULL,
  dados   jsonb NOT NULL
);

-- O cofre de chaves, uma por titular, cada uma cifrada com a chave mestra.
-- Em produção, é um serviço de chaves separado, com backup e retenção próprios.
CREATE TABLE cofre.chaves (
  titular          integer PRIMARY KEY,
  chave_envelopada text NOT NULL
);

-- Trilha de auditoria: cada registro guarda o hash do anterior.
CREATE TABLE auditoria.trilha (
  seq      integer PRIMARY KEY,
  momento  text NOT NULL,
  ator     text NOT NULL,
  acao     text NOT NULL,
  alvo     text NOT NULL,
  anterior text NOT NULL,
  hash     text NOT NULL
);

-- Só inserções: alterar, apagar ou esvaziar a trilha é recusado pelo banco,
-- inclusive para o dono da tabela.
CREATE FUNCTION auditoria.recusar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'a trilha de auditoria só aceita inserções';
END $$;
CREATE TRIGGER so_insercao BEFORE UPDATE OR DELETE ON auditoria.trilha
  FOR EACH ROW EXECUTE FUNCTION auditoria.recusar();
CREATE TRIGGER sem_esvaziar BEFORE TRUNCATE ON auditoria.trilha
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria.recusar();

-- O papel da aplicação: lê e acrescenta na trilha, sem poder alterar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_morada') THEN
    CREATE ROLE app_morada LOGIN PASSWORD 'app';
  END IF;
END $$;
GRANT USAGE ON SCHEMA auditoria TO app_morada;
GRANT SELECT, INSERT ON auditoria.trilha TO app_morada;
