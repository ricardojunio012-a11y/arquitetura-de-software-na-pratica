# Capítulo 5: padrões de projeto

Laboratório do capítulo 5 de *Arquitetura de Software na Prática*.

O módulo de reservas do Morada processa oito pedidos de reserva do salão de festas e da
churrasqueira. Cada parte do fluxo usa um padrão:

| Parte | Padrão |
|---|---|
| Aprovação em quatro etapas (unidade em dia, antecedência, espaço livre, limite do mês) | Chain of Responsibility e Template Method |
| Reservas guardadas e consultadas (só as aprovadas ocupam o espaço) | Repository |
| Ciclo de vida da reserva (pendente, aprovada, recusada, cancelada) | State |
| Reações à reserva (taxa de uso, portaria, aviso ao morador) | Publicar/assinar (parente do Observer) |
| Canais de aviso (e-mail, WhatsApp, SMS) escolhidos pela preferência do morador | Strategy e Factory |
| Retentativas com espera crescente, só para falhas passageiras, e registro | Decorator |

Os provedores de mensagens são simulados: nenhum dado sai da sua máquina. Dois telefones falham de
propósito nas primeiras tentativas (`falhasSimuladas` em `entrada/reservas.json`) e um e-mail não
existe (`destinosInvalidos`). As esperas entre tentativas usam um relógio simulado: nada espera de
verdade, e a saída é sempre a mesma.

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`).

## Roteiro

```bash
# Processar os pedidos e conferir contra o resultado aprovado
docker compose run --rm app reservas
docker compose run --rm ferramentas verificar reservas

# Testes: um por padrão
docker compose run --rm app testes
```

A pasta `saida/reservas` traz as decisões, o registro das tentativas de envio, as esperas entre
tentativas, o que os provedores entregaram, as taxas lançadas, a lista da portaria, as falhas dos
assinantes, os cancelamentos (State) e o resultado dos pedidos simultâneos.

## Agora a parte difícil

`concorrencia.txt` mostra dois pedidos para o salão no mesmo dia passando pela cadeia antes de
qualquer um gravar (a intercalação é forçada, para a saída ser determinística). Verificar e depois
gravar aprova os dois: reserva dupla. Gravar só se o espaço estiver livre, numa operação só
(`salvarSeLivre`), aprova um. Em banco de dados, a mesma ideia vira uma restrição no banco
(capítulo 28).

## Experimente

- Inverta a ordem dos decoradores na fábrica de canais e compare `notificacoes.txt`.
- Crie uma etapa `ForaDeFeriado` e encaixe-a na cadeia de aprovação.
- Crie um assinante `ResumoDoSindico` sem mudar nenhuma classe existente, só a montagem.
