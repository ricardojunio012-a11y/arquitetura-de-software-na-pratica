# Capítulo 19: arquitetura de dados analíticos

Laboratório do capítulo 19 de *Arquitetura de Software na Prática*.

Um pipeline ELT que leva os dados do PostgreSQL do Morada (40 condomínios fictícios) para um banco analítico DuckDB. CPF e placa são pseudonimizados na extração; a transformação monta um modelo dimensional; testes de qualidade separam em quarentena três cobranças com valor zero; o relatório mostra a inadimplência por região e porte.

| Versão | O que faz |
|---|---|
| `elt` | Extrai, carrega, transforma, verifica a qualidade e gera `saida/elt/relatorio.txt`, `qualidade.txt` e `extracao.txt` |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL sobe sozinho; o DuckDB roda dentro da aplicação.

## Roteiro

```bash
docker compose run --rm app elt
docker compose run --rm ferramentas verificar elt
docker compose run --rm app testes
```

## Experimente

- Extraia o CPF sem pseudonimizar, com outro nome de coluna, e veja a verificação de dados pessoais falhar.
- Acrescente uma regra de qualidade nova em `node/src/qualidade.ts`.
- Crie uma dimensão de meses em `sql/modelo.sql` e agrupe o relatório por trimestre.
