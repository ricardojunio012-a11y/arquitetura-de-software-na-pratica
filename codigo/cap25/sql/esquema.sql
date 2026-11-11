-- A fila de tarefas e os boletos. A fila é uma tabela comum: cada worker pega a
-- próxima tarefa pendente com FOR UPDATE SKIP LOCKED, e uma tarefa pega há tempo
-- demais sem terminar volta a ficar disponível (o worker que a pegou morreu).
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE condominios (id integer PRIMARY KEY, unidades integer NOT NULL);
INSERT INTO condominios
SELECT c, 20 + (c * 37) % 181 FROM generate_series(1, 3000) AS c;

CREATE TABLE tarefas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo text NOT NULL,          -- 'mensal' ou 'segunda-via'
  condominio_id integer NOT NULL,
  prioridade integer NOT NULL, -- menor vem primeiro
  estado text NOT NULL DEFAULT 'pendente',
  tentativas integer NOT NULL DEFAULT 0,
  pega_em timestamptz,
  terminada_em timestamptz
);
CREATE INDEX ON tarefas (prioridade, id) WHERE estado <> 'feita';

-- A unicidade torna a geração idempotente: refazer uma tarefa não duplica boletos
CREATE TABLE boletos (
  condominio_id integer NOT NULL,
  unidade integer NOT NULL,
  competencia text NOT NULL,
  PRIMARY KEY (condominio_id, unidade, competencia)
);
