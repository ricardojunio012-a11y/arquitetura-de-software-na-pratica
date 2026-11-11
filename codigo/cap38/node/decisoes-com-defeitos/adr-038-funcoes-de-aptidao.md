# ADR-038: Decisões verificáveis viram funções de aptidão determinísticas na esteira

- Situação: aprovado
- Data: 2026-10-26
- Quem decidiu: fórum de arquitetura, com os Tech Leads dos seis times
- Substitui: ADR-021

## Contexto

O teste de carga com k6 do ADR-021 rodava contra um ambiente compartilhado e reprovava
cerca de uma publicação em oito sem mudança de código. Os times aprenderam a rodá-lo de
novo até passar, e ele foi desligado em agosto. Em setembro, uma consulta por unidade
voltou ao painel de inadimplência e só foi notada no dia 5.

## Decisão

Cada decisão de arquitetura que puder ser verificada por programa ganha uma função de
aptidão determinística na esteira, ligada ao seu ADR. A meta do painel continua a do
ADR-021: p95 abaixo de 300 ms com 40 pedidos por segundo. Ela passa a ser verificada
numa carga simulada, com o número de consultas medido de verdade e o custo de cada uma
fixado por premissa. O k6 roda toda noite contra a homologação, sem barrar publicações.

## Alternativas consideradas

- Religar o k6 com repetição automática: esconde a variação, e não a resolve.
- Ambiente de carga dedicado: cerca de R$ 9 mil por mês, e ainda com variação.

## Consequências

A meta volta a barrar publicações sem depender do ambiente. A simulação não mede o
banco de verdade: uma consulta lenta por falta de índice passa por ela e fica com o
k6 noturno e com o SLO de produção.

## Quando revisitar

Se o k6 noturno e a função simulada discordarem por duas semanas seguidas, ou se a
premissa de custo por consulta ficar mais de 30% longe do medido em produção.
