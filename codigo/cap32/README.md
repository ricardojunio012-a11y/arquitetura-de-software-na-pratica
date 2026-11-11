# Capítulo 32: contêineres, Kubernetes e serverless

Laboratório do capítulo 32 de *Arquitetura de Software na Prática*.

A API do Morada roda num Kubernetes **simulado**: o laboratório lê os manifestos de verdade da pasta `k8s/` (Deployment, Service, HTTPRoute, PodDisruptionBudget e HPA), confere se eles combinam entre si e simula, num relógio lógico com semente fixa, o escalonador, o HPA e o autoescalonador de nós no dia 5. A prestação de contas em PDF é uma função: o código é real, gera PDFs de verdade, e o mês inteiro de chamadas é simulado com partidas a frio e cobrança no modelo da Lambda. O passo opcional `nuvem` publica a mesma função no LocalStack e a chama de verdade.

Por que simular, e não subir um cluster com kind? Um cluster local leva minutos para subir, disputa memória com o resto da máquina e não dá a mesma resposta duas vezes: o momento em que o HPA reage depende do relógio de verdade. A simulação segue o algoritmo descrito na documentação do Kubernetes e dá sempre o mesmo resultado, que pode ser conferido. Os manifestos continuam reais e podem ser aplicados num cluster (`kubectl apply -f k8s/`), desde que exista a imagem e, para a HTTPRoute, um Gateway chamado `entrada-publica`.

| Versão | O que faz |
|---|---|
| `manifestos` | Confere as regras entre os manifestos (seletores, portas, pedidos de CPU, sondas, PDB) |
| `hpa` | O dia 5 em quatro cenários: 3 réplicas fixas, 24 fixas, HPA e HPA com pré-escala |
| `funcao` | Gera três PDFs com o código da função e simula o mês: lote do dia 1 e pedidos avulsos |
| `custo` | Um mês inteiro, em reais: API no EKS, API em VMs com Kamal, PDF como função ou no cluster |
| `nuvem` | (opcional) Publica a função no LocalStack, chama quatro vezes e confere o PDF no bucket |

## Pré-requisito

Docker com Docker Compose. Nenhuma porta é publicada no host. O passo `nuvem` baixa a imagem do LocalStack (cerca de 1,8 GB) e a do runtime Node.js da Lambda, e dá ao LocalStack o socket do Docker, para ele criar os contêineres das funções.

## Roteiro

```bash
docker compose run --rm app manifestos
docker compose run --rm ferramentas verificar manifestos
docker compose run --rm app hpa
docker compose run --rm ferramentas verificar hpa
docker compose run --rm app funcao
docker compose run --rm ferramentas verificar funcao
docker compose run --rm app custo
docker compose run --rm ferramentas verificar custo
docker compose run --rm app testes

# opcional: a função de verdade, no LocalStack
docker compose --profile nuvem run --rm nuvem
docker compose run --rm ferramentas verificar nuvem
docker compose --profile nuvem down -v
```

Os PDFs gerados ficam em `saida/pdf/`.

## Experimente

- Apague o `cpu` de `requests` em `k8s/deployment.yaml` e rode `manifestos` e `hpa`.
- Mude o alvo do HPA de 60% para 80% em `k8s/hpa.yaml`: quantos nós-hora o dia 5 economiza, e quantos pedidos ficam sem resposta?
- Em `src/cluster.ts`, mude `subidaNo` de 120 para 30 s (nós já ligados, à espera): a pré-escala ainda compensa?
- Em `src/plataforma.ts`, mude a ociosidade de 5 para 30 minutos e veja as partidas a frio dos avulsos.
