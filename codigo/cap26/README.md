# Capítulo 26: tempo real e borda

Laboratório do capítulo 26 de *Arquitetura de Software na Prática*.

Avisos de visitante por WebSocket entre duas réplicas da API, sem e com pub/sub no Redis; e o dispositivo da portaria que fica sem rede, guarda os acessos numa fila local e os envia por MQTT quando a rede volta. Na parte difícil, o dispositivo reinicia sem rede, com acessos na fila: a fila em memória perde tudo, a fila em arquivo SQLite não perde nada.

| Versão | O que faz |
|---|---|
| `tempo-real` | O porteiro registra dois visitantes pela api1; os moradores estão conectados a réplicas diferentes |
| `offline` | Dez acessos, com a rede da portaria e o servidor fora do ar por um tempo, e uma repetição |
| `reinicio` | O dispositivo registra três acessos sem rede e é morto com SIGKILL; fila em memória contra fila em SQLite |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O Compose sobe as duas réplicas, o Redis e o broker MQTT (Mosquitto). Os clientes MQTT usam o protocolo 5.0 (`protocolVersion: 5`).

## Roteiro

```bash
docker compose run --rm app tempo-real
docker compose run --rm ferramentas verificar tempo-real
docker compose run --rm app offline
docker compose run --rm ferramentas verificar offline
docker compose run --rm app reinicio
docker compose run --rm ferramentas verificar reinicio
docker compose run --rm --no-deps app testes
docker compose down
```

## Experimente

- Desconecte um morador antes do aviso e pense em como ele descobre o que perdeu.
- Publique os acessos direto, sem a fila local.
- Zere o `sessionExpiryInterval` do servidor, mantendo `clean: false`, e veja os acessos se perderem.
