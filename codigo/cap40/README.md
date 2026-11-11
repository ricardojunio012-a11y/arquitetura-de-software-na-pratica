# Capítulo 40: custo de infraestrutura e FinOps

Laboratório do capítulo 40 de *Arquitetura de Software na Prática*.

Uma calculadora de custo do Morada, em TypeScript. Ela lê uma tabela de entradas, em que cada valor diz de onde veio (o capítulo do livro, a lista pública de preços da AWS ou uma premissa do laboratório), e calcula o custo dos produtos vendidos de um mês, separando infraestrutura e pessoas. Não há nuvem nem serviços: são só contas, e o resultado é sempre o mesmo.

| Versão | O que faz |
|---|---|
| `unidade` | Mostra as entradas, o custo de um mês hoje, o custo por condomínio e por boleto e o showback por módulo |
| `crescimento` | Projeta 10 vezes mais condomínios em três arquiteturas (pool, células e silos), linha por linha |
| `cfo` | Monta a tabela para a diretoria financeira: receita, CPV, margem bruta e custo por unidade |
| `compromisso` | Calcula quanto comprometer num Savings Plan para os nós e quanto a reserva do banco economiza |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript e não sobe outros serviços.

## Roteiro

```bash
docker compose run --rm app unidade
docker compose run --rm ferramentas verificar unidade
docker compose run --rm app crescimento
docker compose run --rm ferramentas verificar crescimento
docker compose run --rm app cfo
docker compose run --rm ferramentas verificar cfo
docker compose run --rm app compromisso
docker compose run --rm ferramentas verificar compromisso
docker compose run --rm app testes
```

## Experimente

- Troque o assistente do modelo menor (R$ 1,16 por condomínio) pelo maior (R$ 23, capítulo 20) e veja a margem.
- Mude a capacidade de atendimento de 1.000 para 2.000 condomínios por pessoa.
- Baixe as instalações por pessoa de plataforma de 5 para 3 e compare células e silos.
- Mude o perfil de uso do mês e encontre o novo compromisso ótimo.
- Depois de cada mudança, `verificar` vai falhar: é o sinal de que o resultado mudou.
