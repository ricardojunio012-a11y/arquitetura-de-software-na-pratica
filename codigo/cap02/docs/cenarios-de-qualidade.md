# Cenários de qualidade do Morada

Versão de outubro de 2026. Cada cenário segue as seis partes propostas por Bass, Clements e Kazman:
fonte, estímulo, artefato, ambiente, resposta e medida da resposta. A coluna "Prioridade" usa a
notação da árvore de utilidade do ATAM: (importância para o negócio, dificuldade técnica), com
A = alta, M = média e B = baixa.

## Árvore de utilidade (resumo)

| Atributo | Refinamento | Cenário | Prioridade |
|---|---|---|---|
| Desempenho | Pico do dia 1º | DES-01, DES-02 | (A, A) |
| Desempenho | Navegação do morador | DES-03 | (M, B) |
| Disponibilidade | Pagamento em dia de vencimento | DIS-01 | (A, M) |
| Segurança | Isolamento entre condomínios | SEG-01 | (A, M) |
| Privacidade | Pedido de exclusão (LGPD) | PRI-01 | (A, M) |
| Modificabilidade | Novo canal de aviso | MOD-01 | (M, B) |
| Confiabilidade | Portaria sem internet | CON-01 | (M, A) |

## Cenários

### DES-01 e DES-02: boletos disponíveis no dia 1º

| Parte | DES-01 (2026) | DES-02 (2029) |
|---|---|---|
| Fonte | Agendador do Morada | Agendador do Morada |
| Estímulo | Geração mensal de 12.000 cobranças (300 condomínios) | Geração mensal de 1,2 milhão de cobranças (30.000 condomínios) |
| Artefato | Cobrança mensal e integração com o banco emissor | Idem |
| Ambiente | Operação normal, dia 1º, 1 vCPU e 512 MB para o cálculo; banco emissor com limite de 50 registros por segundo | Idem |
| Resposta | Todas as cobranças calculadas, boletos registrados e avisos prontos | Idem |
| Medida | Em até 4 horas | Em até 4 horas |

Verificação automática: `docker compose run --rm app cenarios` (ver `cenarios/cenarios.json`).
O tempo até a confirmação do registro em lote (ADR-002), com recusas e novas tentativas, é
simulado por `docker compose run --rm app registro` (ver `cenarios/registro.json`). A medida
"em até 4 horas" vale para todos os boletos: é uma meta sobre o pior caso, não sobre a média.

### DES-03: tela de cobranças do morador

- **Fonte:** morador, no aplicativo ou no navegador.
- **Estímulo:** abre a lista das suas cobranças.
- **Artefato:** aplicação web e API.
- **Ambiente:** operação normal, horário de pico (dia 1º às 9h).
- **Resposta:** a lista aparece com o valor e o código de pagamento.
- **Medida:** 95% das respostas em até 800 ms, medidos no servidor.

### DIS-01: pagamento no dia do vencimento

- **Fonte:** morador.
- **Estímulo:** tenta obter o código de pagamento no dia 5.
- **Artefato:** API do Morada.
- **Ambiente:** falha de uma instância da aplicação.
- **Resposta:** o pedido é atendido por outra instância, sem que o morador perceba.
- **Medida:** disponibilidade mensal de 99,9% nas rotas de pagamento (até 43 minutos fora do ar por mês).

### SEG-01: isolamento entre condomínios

- **Fonte:** usuário autenticado de um condomínio.
- **Estímulo:** pede uma cobrança de outro condomínio, alterando o identificador na URL.
- **Artefato:** API e banco de dados.
- **Ambiente:** operação normal.
- **Resposta:** o pedido é negado e a tentativa é registrada no log de auditoria.
- **Medida:** 100% das tentativas negadas; alerta para a equipe em até 5 minutos se houver mais de 10 tentativas por hora do mesmo usuário.

### PRI-01: exclusão de dados pessoais (LGPD)

- **Fonte:** ex-morador, titular dos dados.
- **Estímulo:** pede a exclusão dos seus dados pessoais.
- **Artefato:** todos os armazenamentos de dados do Morada.
- **Ambiente:** operação normal.
- **Resposta:** dados pessoais apagados ou anonimizados, mantendo o que a lei obriga a guardar (dados fiscais).
- **Medida:** concluído em até 15 dias, com comprovante para o titular.

### MOD-01: novo canal de aviso

- **Fonte:** time de produto.
- **Estímulo:** pede aviso por SMS.
- **Artefato:** código da cobrança mensal.
- **Ambiente:** tempo de desenvolvimento.
- **Resposta:** o canal é incluído sem alterar cálculo, pagamento e relatório.
- **Medida:** até 3 dias de uma pessoa, com testes, e nenhum arquivo existente alterado além da montagem (`main`).

### CON-01: portaria sem internet

- **Fonte:** queda do provedor de internet do condomínio.
- **Estímulo:** o porteiro registra a entrada de um visitante.
- **Artefato:** aplicativo da portaria.
- **Ambiente:** sem conexão por até 4 horas.
- **Resposta:** o registro é aceito localmente e sincronizado quando a conexão volta.
- **Medida:** nenhum registro perdido; sincronização em até 5 minutos após a volta da conexão.
