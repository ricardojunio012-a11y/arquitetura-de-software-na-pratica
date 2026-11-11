-- Carga e transformação (o L e o T do ELT), no DuckDB. Os arquivos da zona bruta viram
-- tabelas brutas, e o modelo dimensional é construído a partir delas com SQL.
CREATE TABLE bruto_condominios AS SELECT * FROM read_csv('{bruta}/condominios.csv');
CREATE TABLE bruto_moradores AS SELECT * FROM read_csv('{bruta}/moradores.csv');
CREATE TABLE bruto_veiculos AS SELECT * FROM read_csv('{bruta}/veiculos.csv');
CREATE TABLE bruto_cobrancas AS SELECT * FROM read_csv('{bruta}/cobrancas.csv');
CREATE TABLE ufs AS SELECT * FROM read_csv('{entrada}/ufs.csv');

-- Dimensão: o condomínio com os atributos usados para agrupar, inclusive os que não
-- existem na origem (região, a partir da UF; porte, a partir do número de unidades)
CREATE TABLE dim_condominio AS
SELECT
  c.id AS condominio_id,
  c.uf,
  u.regiao,
  CASE WHEN c.unidades < 60 THEN 'pequeno'
       WHEN c.unidades < 150 THEN 'médio'
       ELSE 'grande' END AS porte,
  c.unidades
FROM bruto_condominios c
LEFT JOIN ufs u USING (uf);

CREATE TABLE dim_morador AS
SELECT id AS morador_id, condominio_id, cpf_pseudonimo FROM bruto_moradores;

CREATE TABLE dim_veiculo AS
SELECT placa_pseudonimo, morador_id FROM bruto_veiculos;

-- Linhas que violam as regras não entram no fato: vão para a quarentena, com o motivo
CREATE TABLE quarentena_cobrancas AS
SELECT *, 'valor não positivo' AS motivo
FROM bruto_cobrancas
WHERE valor_centavos <= 0;

-- Fato: uma linha por cobrança, com as medidas e as chaves das dimensões
CREATE TABLE fato_cobranca AS
SELECT
  id AS cobranca_id,
  condominio_id,
  morador_id,
  strftime(vencimento, '%Y-%m') AS mes,
  valor_centavos,
  situacao = 'aberta' AS em_aberto
FROM bruto_cobrancas
WHERE valor_centavos > 0;
