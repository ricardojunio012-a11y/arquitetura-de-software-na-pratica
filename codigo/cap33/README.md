# Capítulo 33: entrega contínua, Infraestrutura como Código e plataforma

Laboratório do capítulo 33 de *Arquitetura de Software na Prática*.

Três partes. Na primeira, uma esteira de entrega roda o compilador, os testes, um teste de arquitetura e um canário sobre quatro commits do Morada, e barra a publicação no primeiro estágio que falha. Na segunda, a coluna `celular` vira `telefone` com a aplicação no ar: de uma vez (e quebrando) e em três publicações (expandir, migrar, contrair), com a versão antiga e a nova atendendo juntas contra o mesmo PostgreSQL. Na terceira, o OpenTofu cria a fila, o bucket e o banco de um ambiente, detecta uma mudança feita fora dele e a desfaz.

| Versão | O que faz |
|---|---|
| `esteira` | Passa os commits `c1` a `c4` (em `node/src/commits/`) pela esteira; `c0` é a versão em produção |
| `renomear` | Renomeia a coluna na mesma publicação do código novo, nas duas ordens possíveis |
| `expandir` | Faz a troca em três publicações, com duas versões no ar em cada uma |
| `atalho` | As mesmas publicações, mas copiando os dados antes de a versão antiga sair |
| `infra` | Planeja, aplica, confere pelos SDKs, provoca uma deriva, corrige e destrói |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. Ele sobe um PostgreSQL 17 e o LocalStack 4.14.0, sem publicar portas no computador.

O LocalStack passou a exigir conta e token a partir de 23 de março de 2026. A versão 4.14.0, de fevereiro de 2026, é a última que roda sem conta, e por isso fica fixa. A edição gratuita não tem RDS: o OpenTofu cria o papel e o banco dos relatórios no PostgreSQL do Compose, pelo provedor `cyrilgdn/postgresql`.

## Roteiro

```bash
docker compose run --rm app esteira
docker compose run --rm ferramentas verificar esteira
docker compose run --rm app renomear
docker compose run --rm ferramentas verificar renomear
docker compose run --rm app expandir
docker compose run --rm ferramentas verificar expandir
docker compose run --rm app atalho
docker compose run --rm ferramentas verificar atalho
docker compose run --rm app infra
docker compose run --rm ferramentas verificar infra
docker compose run --rm app testes
docker compose down -v
```

A primeira construção da imagem baixa os provedores do OpenTofu (algumas centenas de megabytes). A versão `infra` leva alguns minutos, quase todos gastos carregando o provedor da AWS a cada comando.

## Experimente

- Em `c3/dominio/encargos.ts`, tire o `import` do adaptador e passe a função `ehFeriado` como parâmetro: o teste de arquitetura passa?
- Em `c4/adaptadores/feriados-fixos.ts`, cadastre os feriados de 2027 e rode a esteira: o canário aprova, e a taxa de falha de mudança cai.
- Em `canario.ts`, mude a tolerância de 0,5 para 5 pontos percentuais. O que passa a chegar a 100% do tráfego?
- Em `publicacoes.ts`, no cenário `expandir`, remova a coluna antiga antes de a v3 sair. Quantos erros aparecem?
- Em `infra/principal.tf`, mude `maxReceiveCount` para 3 e veja o plano antes de aplicar.
