# Capítulo 14: arquitetura de testes

Laboratório do capítulo 14 de *Arquitetura de Software na Prática*.

Um contrato orientado ao consumidor entre o monólito e o serviço de Comunicação, testes de integração contra um PostgreSQL real em contêiner e a medição do tempo de cada camada da suíte.

| Versão | O que faz |
|---|---|
| `consumidor` | O cliente do monólito conversa com um dublê e publica `saida/consumidor/contrato.json` |
| `provedor` | Lê o contrato, prepara o estado de cada interação e verifica a API real da Comunicação |

## Pré-requisito

Docker com Docker Compose. Escolha a linguagem em `.env` (`node`, `php`, `python` ou `java`). O Compose sobe um PostgreSQL para os testes de integração e de ponta a ponta.

## Roteiro

```bash
docker compose run --rm app consumidor
docker compose run --rm ferramentas verificar consumidor
docker compose run --rm app provedor
docker compose run --rm ferramentas verificar provedor

# Testes de unidade, integração e ponta a ponta
docker compose run --rm app testes

# Tempo de cada camada, informado pela ferramenta de testes
docker compose run --rm app medir
```

## Experimente

- Troque `repetido` por `duplicado` na API da Comunicação e rode o provedor de novo.
- Acrescente um campo `enviadoEm` à resposta e veja que o contrato continua verificado.
- Remova `PRIMARY KEY` da tabela de avisos e descubra qual teste falha.
