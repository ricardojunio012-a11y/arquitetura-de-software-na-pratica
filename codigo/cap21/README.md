# Capítulo 21: desempenho, latência e testes de carga

Laboratório do capítulo 21 de *Arquitetura de Software na Prática*.

A rota de inadimplência do painel do síndico sob a carga do dia 5, simulada com o k6. A versão `n1` faz uma consulta por unidade; a `corrigido`, uma consulta só. As duas devolvem a mesma resposta.

| Versão | O que faz |
|---|---|
| `n1` | Sobe a API com a rota N+1, mede o perfil de um pedido e roda o teste de carga |
| `corrigido` | O mesmo com a rota corrigida |

O perfil de cada versão (consultas por pedido e resumo da resposta) vai para `saida/<versão>/perfil.txt` e é verificado. Os tempos dependem da máquina e vão para `saida/tempos-<versão>.txt`, fora da verificação.

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O PostgreSQL sobe sozinho; o k6 vem dentro da imagem da aplicação.

## Roteiro

```bash
docker compose run --rm app n1
docker compose run --rm ferramentas verificar n1
docker compose run --rm app corrigido
docker compose run --rm ferramentas verificar corrigido
docker compose run --rm app testes
```

## Experimente

- Reduza o pool de conexões e veja a cauda crescer.
- Troque o cenário do k6 por usuários fixos e veja a omissão coordenada esconder o problema.
- Aumente a carga até a versão corrigida falhar.
