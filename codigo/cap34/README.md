# Capítulo 34: observabilidade e engenharia de confiabilidade (SRE)

Laboratório do capítulo 34 de *Arquitetura de Software na Prática*.

O pagamento de uma taxa de condomínio é rastreado com o SDK do OpenTelemetry, do aplicativo do morador ao e-mail de confirmação, passando pela outbox e pela fila. Depois, dez minutos de tráfego da API viram métricas RED, um teste de cardinalidade e uma comparação de amostragem. Por fim, um mês inteiro da API de pagamentos, minuto a minuto, mede o SLI, o orçamento de erro do SLO e mostra quais alertas por taxa de consumo disparam, e quando. Tudo roda num processo só, com relógio simulado e sementes fixas: a saída é sempre a mesma.

| Versão | O que faz |
|---|---|
| `rastro` | O rastro do pagamento com o contexto propagado e sem o `traceparent` na outbox; grava `rastro.txt`, `trechos.jsonl` (o exportador) e `logs.jsonl` (logs estruturados com `trace_id`) |
| `metricas` | RED por rota a partir de um histograma do OpenTelemetry, a cardinalidade com e sem o condomínio como atributo e a amostragem na cabeça e na cauda |
| `slo` | Novembro simulado: SLI, orçamento do SLO de 99,95%, SLA de 99,9%, alertas multi-janela (SRE Workbook) e um alerta ingênuo para comparar |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript e não publica portas no host.

## Roteiro

```bash
docker compose run --rm app rastro
docker compose run --rm ferramentas verificar rastro
docker compose run --rm app metricas
docker compose run --rm ferramentas verificar metricas
docker compose run --rm app slo
docker compose run --rm ferramentas verificar slo
docker compose run --rm app testes
```

## Experimente

- Em `src/pagamento.ts`, tire o `traceparent` do cabeçalho HTTP e veja quantos rastros sobram.
- Em `src/metricas.ts`, acrescente o balde de 0,4 s e compare o p95 estimado com o exato.
- Em `src/slo.ts`, troque o SLO para 99,9% e veja quais alertas deixam de disparar.
- Em `src/slo.ts`, mude o incidente B para durar 10 minutos: a página de 1 hora dispara?

## Jaeger, Prometheus e Grafana

O laboratório usa o SDK do OpenTelemetry com um exportador em memória, para a saída ser verificável e para não publicar portas. Para ver o rastro numa interface, troque o `ExportadorEmMemoria` pelo exportador OTLP (`@opentelemetry/exporter-trace-otlp-http`) e suba um Jaeger com a porta da interface publicada, numa máquina em que isso não atrapalhe outros projetos.
