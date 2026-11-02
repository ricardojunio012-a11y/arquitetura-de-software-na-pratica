# Capítulo 13: front-end, mobile e Backend for Frontend

Laboratório do capítulo 13 de *Arquitetura de Software na Prática*.

O BFF do tablet da portaria: a tela inicial numa única chamada e a sincronização das operações feitas sem internet, com fila local, identificador por operação e versão do dado.

| Versão | O que faz |
|---|---|
| `online` | Os dois tablets conectados o tempo todo |
| `offline` | O tablet A perde a internet, guarda três operações e as reenvia ao voltar; a primeira resposta se perde |
| `reinicio` | A parte difícil: o BFF reinicia entre o envio perdido e o reenvio, e a idempotência em memória falha (conflito falso e visitante registrada duas vezes) |
| `persistida` | O mesmo roteiro, com o resultado de cada operação guardado fora da memória do BFF: o reenvio volta a ser reconhecido |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`).

## Roteiro

```bash
docker compose run --rm app online
docker compose run --rm ferramentas verificar online
docker compose run --rm app offline
docker compose run --rm ferramentas verificar offline
docker compose run --rm app reinicio
docker compose run --rm ferramentas verificar reinicio
docker compose run --rm app persistida
docker compose run --rm ferramentas verificar persistida
docker compose run --rm app testes
```

Compare os dois `registro.txt`: o conflito muda de tablet conforme a ordem em que as operações chegam. Depois compare `reinicio/estado.txt` com `persistida/estado.txt`: a idempotência só vale enquanto o registro das operações aplicadas existir.

## Experimente

- Faça o BFF ignorar o identificador das operações e observe o reenvio.
- Faça a Portaria ignorar a versão (último escritor vence) e veja quem fica sabendo.
- Acrescente um campo à tela inicial sem quebrar um tablet que ainda não o conhece.
