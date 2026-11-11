# Capítulo 18: arquitetura de integração

Laboratório do capítulo 18 de *Arquitetura de Software na Prática*.

O webhook de um gateway de pagamento, assinado no formato Standard Webhooks, recebido por dois receptores, e o retorno de cobrança de um banco fictício traduzido por uma camada anticorrupção.

| Versão | O que faz |
|---|---|
| `webhook` | Passa as mesmas sete entregas (`entrada/webhook.json`) pelo receptor ingênuo e pelo robusto, que verifica assinatura, janela de tempo, repetição e ordem |
| `cnab` | Lê `entrada/retorno-banco-alfa.txt`, um layout simplificado inspirado no CNAB 240, e devolve os pagamentos do domínio |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript e não usa banco de dados.

## Roteiro

```bash
docker compose run --rm app webhook
docker compose run --rm ferramentas verificar webhook
docker compose run --rm app cnab
docker compose run --rm ferramentas verificar cnab
docker compose run --rm app testes
```

## Experimente

- Altere o corpo de uma entrega depois de assinada e veja qual receptor percebe.
- Desligue a verificação de ordem e veja em que estado termina a C-103.
- Marque a entrega como processada antes de aplicá-la e veja o teste "não perde a entrega quando aplicar falha" quebrar.
- Corte o arquivo de retorno e veja o trailer recusar o arquivo inteiro.
