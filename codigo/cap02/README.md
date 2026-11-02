# Capítulo 2: requisitos de qualidade e comunicação da arquitetura

Laboratório do capítulo 2 de *Arquitetura de Software na Prática*.

Os requisitos de qualidade do Morada viram cenários escritos (`docs/cenarios-de-qualidade.md`) e
dois deles viram cenários **executáveis**: um programa gera a carga do dia 1º, mede o cálculo das
cobranças, estima o registro dos boletos no banco emissor e diz se a meta foi cumprida. A
arquitetura é descrita com o modelo C4, como código (`docs/c4/workspace.dsl`), e com um arc42
resumido (`docs/arquitetura.md`). O comando `registro` simula a fila de registro em lote no banco
emissor, com limite de vazão, recusas parciais e nova tentativa, e mede o tempo até cada boleto
ficar disponível (p50, p95, p99) contra a meta de 4 horas do DES-02.

## Pré-requisito

Docker com Docker Compose. Nenhuma linguagem precisa estar instalada.

## Escolher a linguagem e o ambiente

Edite `.env`: `LINGUAGEM` (`node`, `php`, `python` ou `java`), `CPUS` e `MEMORIA` do contêiner que
roda os cenários.

## Roteiro

```bash
# 1. Rodar os cenários de desempenho (DES-02 falha de propósito)
docker compose run --rm app cenarios

# 2. Agora a parte difícil: simular a fila de registro em lote (semente fixa)
docker compose run --rm app registro
docker compose run --rm app registro | diff - esperado/registro.txt

# 3. Rodar os testes do executor de cenários
docker compose run --rm app testes

# 4. Ver os diagramas C4 em http://localhost:8080
docker compose up -d structurizr

# 5. Encerrar
docker compose down
```

## Experimente

- Mude `CPUS` para `0.25` no `.env` e rode os cenários de novo. O cálculo fica mais lento, mas o
  resultado não muda: o gargalo é o banco emissor.
- Em `cenarios/cenarios.json`, troque `registrosPorSegundo` do DES-02 para `2000` (registro em lote
  por arquivo) e rode de novo.
- Em `cenarios/registro.json`, mude `retornoSegundos` para `10800` (retorno em 3 horas) e rode
  `registro` de novo. A divisão continua dizendo 10 minutos; compare as duas estratégias. As
  premissas do arquivo são do laboratório, não de um banco real.
- Inclua no `docs/c4/workspace.dsl` um contêiner "Fila de registro" entre a cobrança e o banco
  emissor e veja o diagrama mudar.

Ao abrir o modelo, o Structurizr cria `docs/c4/workspace.json` e `docs/c4/.structurizr/`; os dois
podem ser apagados.
