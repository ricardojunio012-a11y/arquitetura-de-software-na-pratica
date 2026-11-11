-- Três tabelas de reservas, uma para cada forma de proteger a churrasqueira, e as
-- tabelas do pagamento com chave de idempotência.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION btree_gist;

-- 1. Sem proteção nenhuma no banco: a aplicação confere antes de inserir
CREATE TABLE reservas_ingenuas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  espaco text NOT NULL,
  morador text NOT NULL,
  periodo tstzrange NOT NULL
);

-- 2. Bloqueio otimista: a agenda do espaço tem uma versão, e só grava quem leu a atual
CREATE TABLE agendas (espaco text PRIMARY KEY, versao integer NOT NULL);
INSERT INTO agendas VALUES ('churrasqueira', 1);
CREATE TABLE reservas_otimistas (LIKE reservas_ingenuas INCLUDING ALL);

-- 3. Restrição de exclusão: o banco recusa dois períodos que se sobrepõem no mesmo
-- espaço, venha a inserção de onde vier
CREATE TABLE reservas (
  LIKE reservas_ingenuas INCLUDING ALL,
  EXCLUDE USING gist (espaco WITH =, periodo WITH &&)
);

-- O pagamento: a chave de idempotência é gravada na mesma transação do pagamento
CREATE TABLE pagamentos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cobranca text NOT NULL,
  valor_centavos integer NOT NULL
);
CREATE TABLE idempotencia (
  chave text PRIMARY KEY,
  pagamento_id integer REFERENCES pagamentos
);
