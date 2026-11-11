-- 2.000 condomínios, 50 unidades cada, 10 meses de cobranças: 1 milhão de linhas.
-- Cerca de uma cobrança em cada 23 está em aberto.
INSERT INTO cobrancas (condominio_id, unidade, vencimento, valor_centavos, situacao)
SELECT c, lpad(u::text, 3, '0'), make_date(2026, m, 10), 40000 + (u % 7) * 2500,
       CASE WHEN (c + u + m) % 23 = 0 THEN 'aberta' ELSE 'paga' END
FROM generate_series(1, 2000) AS c,
     generate_series(1, 50) AS u,
     generate_series(1, 10) AS m;
