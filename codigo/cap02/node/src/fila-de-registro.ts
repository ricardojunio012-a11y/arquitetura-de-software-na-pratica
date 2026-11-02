// Simulação da fila de registro em lote no banco emissor (o "agora a parte difícil").
// Relógio simulado e sorteio com semente fixa: a mesma saída em qualquer máquina.
// Os números de registro.json são premissas do laboratório, não de um banco real.

export interface Premissas {
  id: string;
  descricao: string;
  boletos: number;
  boletosPorArquivo: number;
  registrosPorSegundo: number; // vazão do banco ao processar um arquivo de remessa
  retornoSegundos: number; // o retorno de cada arquivo chega este tempo depois
  falhaPassageiraPorCento: number; // recusa que pode dar certo numa nova tentativa
  recusaDefinitivaACada: number; // 1 a cada N boletos tem dado inválido (ex.: CPF)
  maxTentativas: number;
  limiteSegundos: number;
  semente: number;
}

export interface Resultado {
  arquivos: number;
  tentativas: number;
  disponivelEm: Map<number, number>; // segundo da simulação -> quantos boletos
  semRegistro: number; // nunca ficaram disponíveis
  viaPix: number; // receberam o Pix no lugar do boleto
}

// Gerador congruente de Park e Miller: só inteiros, igual nas quatro linguagens
function sorteador(semente: number) {
  let x = semente;
  return () => (x = (x * 48271) % 2147483647);
}

interface Arquivo {
  envio: number;
  ordem: number;
  boletos: number[];
  tentativa: number;
}

// ingênua: reenvia toda recusa e só avisa o morador com o boleto registrado.
// ajustada: recusa definitiva não volta para a fila, e o boleto que não daria
// tempo de confirmar vira Pix (a alternativa do ADR-002).
export function simular(p: Premissas, ajustada: boolean): Resultado {
  const sortear = sorteador(p.semente);
  const fila: Arquivo[] = [];
  for (let i = 0; i < p.boletos; i += p.boletosPorArquivo) {
    const fim = Math.min(p.boletos, i + p.boletosPorArquivo);
    const boletos = Array.from({ length: fim - i }, (_, k) => i + k);
    fila.push({ envio: 0, ordem: fila.length, boletos, tentativa: 1 });
  }
  const r: Resultado = {
    arquivos: 0,
    tentativas: 0,
    disponivelEm: new Map(),
    semRegistro: 0,
    viaPix: 0,
  };
  const disponivel = (t: number) =>
    r.disponivelEm.set(t, (r.disponivelEm.get(t) ?? 0) + 1);
  let ordem = fila.length;
  let bancoLivre = 0;
  while (fila.length > 0) {
    // O banco processa um arquivo por vez, na ordem de chegada
    let i = 0;
    for (let k = 1; k < fila.length; k++) {
      const a = fila[k],
        b = fila[i];
      if (a.envio < b.envio || (a.envio === b.envio && a.ordem < b.ordem)) i = k;
    }
    const arq = fila.splice(i, 1)[0];
    r.arquivos++;
    r.tentativas += arq.boletos.length;
    const n = arq.boletos.length;
    const inicio = Math.max(arq.envio, bancoLivre);
    bancoLivre = inicio + Math.ceil(n / p.registrosPorSegundo);
    const retorno = bancoLivre + p.retornoSegundos;
    const reenviar: number[] = [];
    for (const b of arq.boletos) {
      const definitiva = b % p.recusaDefinitivaACada === 0;
      const recusado = definitiva || sortear() % 100 < p.falhaPassageiraPorCento;
      if (!recusado) {
        disponivel(retorno);
      } else if (!ajustada) {
        if (arq.tentativa < p.maxTentativas) reenviar.push(b);
        else r.semRegistro++;
      } else if (
        definitiva ||
        arq.tentativa >= p.maxTentativas ||
        retorno + p.retornoSegundos > p.limiteSegundos
      ) {
        disponivel(retorno); // o aviso sai com o Pix, sem esperar outro ciclo
        r.viaPix++;
      } else {
        reenviar.push(b);
      }
    }
    if (reenviar.length > 0) {
      const tentativa = arq.tentativa + 1;
      fila.push({ envio: retorno, ordem: ordem++, boletos: reenviar, tentativa });
    }
  }
  return r;
}

// Percentil pela posição mais próxima, em milésimos (990 = p99, 999 = p99,9).
// Devolve null quando ele cai nos boletos que nunca ficaram disponíveis.
export function percentil(r: Resultado, total: number, milesimos: number) {
  const posicao = Math.ceil((milesimos * total) / 1000);
  let acumulado = 0;
  for (const t of [...r.disponivelEm.keys()].sort((a, b) => a - b)) {
    acumulado += r.disponivelEm.get(t)!;
    if (acumulado >= posicao) return t;
  }
  return null;
}

export function disponiveisAte(r: Resultado, limite: number): number {
  let soma = 0;
  for (const [t, n] of r.disponivelEm) if (t <= limite) soma += n;
  return soma;
}
