-- A base de conhecimento do Assistente: cada trecho dos documentos de um condomínio,
-- com o seu vetor. O pgvector acrescenta o tipo vector e a distância de cosseno (<=>).
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION vector;

CREATE TABLE trechos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  condominio_id integer NOT NULL,
  documento text NOT NULL,
  texto text NOT NULL,
  embedding vector(256) NOT NULL
);
