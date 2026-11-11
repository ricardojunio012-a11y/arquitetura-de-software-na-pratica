# Capítulo 29: resiliência e modos de falha

Laboratório do capítulo 29 de *Arquitetura de Software na Prática*.

O gateway de pagamento fica fora do ar e depois instável, e o Morada, com 16 trabalhadores, atende 20 pagamentos e 50 consultas de avisos por segundo. As proteções entram uma por vez: tempo limite, novas tentativas com espera exponencial e variação, disjuntor e anteparo. Tudo roda num relógio simulado, com sementes fixas: seis segundos de tráfego levam uma fração de segundo, e o resultado é sempre o mesmo.

| Versão | O que faz |
|---|---|
| `resiliencia` | Roda o cenário com as proteções acrescentadas uma por vez, e com o anteparo sozinho |
| `camadas` | Mostra as novas tentativas se multiplicando em três camadas, e o efeito de um orçamento |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript e não sobe outros serviços.

## Roteiro

```bash
docker compose run --rm app resiliencia
docker compose run --rm ferramentas verificar resiliencia
docker compose run --rm app camadas
docker compose run --rm ferramentas verificar camadas
docker compose run --rm app testes
```

## Experimente

- Troque o tempo limite de 300 ms por 3.000 ms e por 30 ms.
- Tire a variação das esperas e aumente a carga.
- Baixe o limiar do disjuntor de 80% para 40%.
- Faça o gateway cobrar antes de deixar de responder e troque a chave de idempotência por uma nova a cada tentativa: conte as cobranças duplicadas.
