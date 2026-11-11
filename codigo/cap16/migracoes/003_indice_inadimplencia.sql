-- sem transação
-- Índice da consulta de inadimplência: as colunas comparadas por igualdade primeiro,
-- a comparada por intervalo por último. CONCURRENTLY constrói o índice sem bloquear
-- as escritas na tabela, mas não pode rodar dentro de uma transação.
CREATE INDEX CONCURRENTLY cobrancas_inadimplencia
  ON cobrancas (condominio_id, situacao, vencimento);
