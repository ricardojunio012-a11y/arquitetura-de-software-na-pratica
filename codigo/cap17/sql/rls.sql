-- Row-Level Security: o banco filtra as linhas de cada consulta pelo condomínio da
-- transação, definido pela aplicação em app.condominio. Sem condomínio definido, a
-- comparação dá nulo e nenhuma linha passa. O NULLIF trata o valor vazio que a
-- configuração assume depois que uma transação com SET LOCAL termina.
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY isolamento_por_condominio ON cobrancas
  USING (
    condominio_id = NULLIF(current_setting('app.condominio', true), '')::integer
  )
  WITH CHECK (
    condominio_id = NULLIF(current_setting('app.condominio', true), '')::integer
  );

-- A administradora enxerga os condomínios que administra. As duas políticas são
-- permissivas, e o banco aceita a linha que passar em qualquer uma delas. A lista de
-- condomínios vem da tabela administracoes, e não da aplicação: a aplicação só diz
-- quem é a administradora, em app.administradora.
CREATE POLICY acesso_da_administradora ON cobrancas
  USING (
    condominio_id IN (
      SELECT condominio_id FROM administracoes
      WHERE administradora_id =
        NULLIF(current_setting('app.administradora', true), '')::integer
    )
  )
  WITH CHECK (
    condominio_id IN (
      SELECT condominio_id FROM administracoes
      WHERE administradora_id =
        NULLIF(current_setting('app.administradora', true), '')::integer
    )
  );
