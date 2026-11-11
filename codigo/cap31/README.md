# Capítulo 31: nuvem, serviços gerenciados e dependência de fornecedor

Laboratório do capítulo 31 de *Arquitetura de Software na Prática*.

A infraestrutura do Morada (um bucket S3, duas filas SQS e uma tabela DynamoDB, na região `sa-east-1`) é criada pelo SDK da AWS para JavaScript, versão 3, no LocalStack 4.14.0, um emulador das APIs da AWS que roda num contêiner. Nenhuma conta da AWS é necessária. O caso de uso (publicar a prestação de contas e avisar os moradores) só conhece três portas, e roda igual com os adaptadores da AWS e com os em memória. A versão `custo` mede quanto a abstração custou.

| Versão | O que faz |
|---|---|
| `provisionar` | Cria os recursos pelo SDK, roda de novo para mostrar que nada muda e confere a configuração lendo da própria nuvem |
| `fluxo` | Roda o mesmo núcleo com os adaptadores em memória e com os da AWS, compara e conta as chamadas |
| `abandono` | Um worker recebe a tarefa e cai antes de confirmar: na AWS ela volta, no adaptador em memória se perde |
| `custo` | Compara a versão com portas e a versão direta, sem portas: linhas, arquivos que importam o SDK e chamadas |

## Pré-requisito

Docker com Docker Compose. Este laboratório tem só a versão em TypeScript. O LocalStack 4.14.0 é a última versão que roda sem conta; a partir da 2026.03, a imagem exige um token (veja o capítulo).

## Roteiro

```bash
docker compose run --rm app provisionar
docker compose run --rm ferramentas verificar provisionar
docker compose run --rm app fluxo
docker compose run --rm ferramentas verificar fluxo
docker compose run --rm app custo
docker compose run --rm ferramentas verificar custo
docker compose run --rm app abandono
docker compose run --rm ferramentas verificar abandono
docker compose run --rm app testes
docker compose down -v
```

## Experimente

- Escreva no `contrato.test.ts` o teste do abandono e veja-o falhar no adaptador em memória; depois, dê a `TarefasEmMemoria` um prazo de visibilidade com um relógio controlado pelo teste.
- Acrescente à porta `Arquivos` um link temporário (`@aws-sdk/s3-request-presigner`) e rode a versão `custo` de novo.
- Corrija a ordem dos passos de `publicarPrestacao` para que uma queda entre o registro e a publicação da tarefa não perca o aviso.
