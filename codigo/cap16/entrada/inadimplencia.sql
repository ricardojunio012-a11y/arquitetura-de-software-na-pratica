-- Cobranças vencidas e não pagas do condomínio 1234, por unidade.
SELECT unidade, count(*) AS cobrancas, sum(valor_centavos) AS total_centavos
FROM cobrancas
WHERE condominio_id = 1234 AND situacao = 'aberta' AND vencimento < DATE '2026-10-01'
GROUP BY unidade
ORDER BY unidade
