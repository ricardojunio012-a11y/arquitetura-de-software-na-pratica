# ADR-021: Metas de latência em percentis e teste de carga do dia 5 no pipeline

- Situação: aceito
- Data: 2025-03-17
- Quem decidiu: Tech Lead do Financeiro e time de plataforma

## Contexto

O painel de inadimplência ficava lento todo dia 5. A média de 190 ms escondia um p95
acima de 700 ms, e a medida mostrou 121 consultas por abertura do painel.

## Decisão

As rotas críticas têm metas de latência em percentis, sob a carga do pico: o painel de
inadimplência, p95 abaixo de 300 ms. Um teste de carga com k6 roda no pipeline antes de
cada publicação e reprova as que violam a meta.

## Alternativas consideradas

- Dobrar o servidor do banco: caro e sem saber onde ia o tempo.
- Medir só em produção: a regressão chegaria ao morador antes do alarme.

## Consequências

Regressões aparecem antes da produção. O pipeline fica mais lento e depende de um
ambiente de teste com volume realista.

## Quando revisitar

Se o teste no pipeline ficar instável por variação do ambiente de testes.
