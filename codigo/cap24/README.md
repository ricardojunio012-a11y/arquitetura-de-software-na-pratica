# Capítulo 24: escalando o banco de dados

Laboratório do capítulo 24 de *Arquitetura de Software na Prática*.

Uma réplica de leitura de verdade, atrasada de propósito em dois segundos; a tabela de acessos da portaria particionada por mês; e as cobranças de nove condomínios divididas entre três bancos, com roteamento na aplicação, shards lógicos e identificadores com o shard embutido.

| Versão | O que faz |
|---|---|
| `replica` | O morador paga no primário e lê na réplica atrasada; depois, lê o que escreveu pelo ponto do log |
| `particao` | Mostra que partições cada consulta lê e remove um mês inteiro com `DROP` da partição |
| `sharding` | Distribui as cobranças, consulta um condomínio e todos, decodifica um ID e move um shard lógico |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O Compose sobe o primário e a réplica; os três shards são bancos no mesmo servidor.

## Roteiro

```bash
docker compose run --rm app replica
docker compose run --rm ferramentas verificar replica
docker compose run --rm app particao
docker compose run --rm ferramentas verificar particao
docker compose run --rm app sharding
docker compose run --rm ferramentas verificar sharding
docker compose run --rm --no-deps app testes
docker compose down
```

## Experimente

- Retire o atraso da réplica e veja se a leitura logo depois ainda falha.
- Insira um acesso num mês sem partição.
- Simule um condomínio que concentra metade das cobranças.
