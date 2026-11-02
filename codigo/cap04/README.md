# Capítulo 4: SOLID e GRASP

Laboratório do capítulo 4 de *Arquitetura de Software na Prática*.

A emissão de cobranças do Morada calcula a cobrança de cada unidade (taxa, fundo de reserva,
isenção do síndico, débito anterior, multa, juros e desconto antecipado) e registra cada uma num
provedor de pagamento. O laboratório traz duas versões com a mesma saída:

| Versão | Como está organizada |
|---|---|
| `antes` | Uma função com todas as regras em ifs encadeados, que chama o SDK do Banco Alfa no meio do cálculo |
| `depois` | Uma classe por regra atrás da interface `Regra`, uma calculadora fechada para modificação, a emissão dependendo da interface `GatewayDePagamento` e um adaptador por provedor, tudo montado no `main` (raiz de composição) |

Os SDKs do Banco Alfa (boleto) e do PagaFácil (Pix) são simulados em `externos/`: nenhum dado sai
da sua máquina.

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem (`node`, `php`, `python` ou `java`) e o gateway
(`alfa` ou `pagafacil`) em `.env`.

## Roteiro

```bash
# Emitir com cada versão e conferir contra o resultado aprovado para o gateway do .env
docker compose run --rm app antes
docker compose run --rm ferramentas verificar antes
docker compose run --rm app depois
docker compose run --rm ferramentas verificar depois

# Testes: um deles mostra que a versão antes não calcula sem emitir boletos
docker compose run --rm app testes
```

## Experimente

- Troque `GATEWAY=pagafacil` no `.env` e rode `depois` e `verificar depois`: as cobranças são as
  mesmas e os registros passam a ser Pix. Rode `antes` e `verificar antes`: falha, porque o banco
  está fixo no código.
- Crie uma regra nova, por exemplo uma chamada para obra de R$ 50,00 por unidade, como uma classe
  que implementa `Regra`, e inclua-a na lista do `main`. Nenhuma outra classe muda; a linha nova
  aparece sozinha no relatório.
