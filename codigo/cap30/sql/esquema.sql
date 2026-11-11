-- Cada serviço tem o seu esquema e só mexe nele; no mundo real, seriam bancos
-- separados. Nenhuma transação atravessa dois esquemas.
DROP SCHEMA IF EXISTS contratos, cobranca, plataforma, cadastro, avisos, orquestrador CASCADE;

CREATE SCHEMA contratos;
CREATE TABLE contratos.contratos (
  saga text PRIMARY KEY,
  condominio text NOT NULL,
  estado text NOT NULL, -- assinado | cancelado
  motivo text
);

-- Lançamentos, nunca apagados: a compensação de uma cobrança é um estorno
CREATE SCHEMA cobranca;
CREATE TABLE cobranca.lancamentos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chave text UNIQUE NOT NULL, -- idempotência: saga e passo
  condominio text NOT NULL,
  tipo text NOT NULL, -- cobranca | estorno
  valor_centavos integer NOT NULL
);

CREATE SCHEMA plataforma;
CREATE TABLE plataforma.tenants (
  saga text PRIMARY KEY,
  condominio text NOT NULL,
  estado text NOT NULL -- ativo | desativado
);

CREATE SCHEMA cadastro;
CREATE TABLE cadastro.moradores (
  saga text NOT NULL,
  nome text NOT NULL,
  cpf text NOT NULL,
  unidade text NOT NULL
);

CREATE SCHEMA avisos;
CREATE TABLE avisos.enviados (
  chave text PRIMARY KEY,
  condominio text NOT NULL,
  destinatarios integer NOT NULL
);

-- O estado da saga, gravado a cada passo: é o que permite retomar depois de uma queda
CREATE SCHEMA orquestrador;
CREATE TABLE orquestrador.sagas (
  id text PRIMARY KEY,
  -- executando | compensando | concluida | compensada | parada (espera uma pessoa)
  estado text NOT NULL,
  concluidos integer NOT NULL DEFAULT 0,
  motivo text -- por que a saga está compensando ou parada
);
CREATE TABLE orquestrador.historico (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  saga text NOT NULL,
  texto text NOT NULL
);
