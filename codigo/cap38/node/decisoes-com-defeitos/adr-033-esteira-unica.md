# ADR-033: Esteira única com testes de arquitetura e canário

- Situação: aceito
- Data: 2026-02-09
- Quem decidiu: time de plataforma, com os Tech Leads dos seis times

## Contexto

As publicações eram semanais, manuais e com dezenas de mudanças. Uma migração que
renomeou uma coluna causou doze minutos de erros, e o SOC 2 pede evidência de controle
de mudanças.

## Decisão

Toda mudança vai para o tronco e passa por uma esteira única: compilação, testes,
testes de arquitetura, artefato imutável e canário com 5% do tráfego.

## Alternativas consideradas

- Uma esteira por time: cada uma com regras e evidências diferentes para o auditor.
- Manter a publicação semanal com mais revisão: mais espera e o mesmo risco.

## Consequências

Publicações diárias e pequenas, com evidência saindo da esteira. A esteira vira peça
crítica e precisa de um caminho de emergência auditado.

## Quando revisitar

Se a esteira passar de 15 minutos no percentil 90, ou se a taxa de falha de mudança não
cair em dois trimestres.
