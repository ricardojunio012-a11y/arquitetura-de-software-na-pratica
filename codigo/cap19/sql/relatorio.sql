-- Inadimplência por região e porte: a parte do valor das cobranças vencidas que
-- continua em aberto. Uma consulta que, no banco transacional, juntaria quatro tabelas
-- e varreria todas as cobranças de todos os condomínios.
SELECT
  d.regiao,
  d.porte,
  count(*)::INTEGER AS cobrancas,
  count(*) FILTER (WHERE f.em_aberto)::INTEGER AS em_aberto,
  round(100.0 * sum(f.valor_centavos) FILTER (WHERE f.em_aberto)
        / sum(f.valor_centavos), 1)::DOUBLE AS inadimplencia
FROM fato_cobranca f
JOIN dim_condominio d USING (condominio_id)
GROUP BY d.regiao, d.porte
ORDER BY d.regiao, CASE d.porte WHEN 'pequeno' THEN 1 WHEN 'médio' THEN 2 ELSE 3 END
