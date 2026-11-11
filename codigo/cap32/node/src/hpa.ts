// O cálculo do HorizontalPodAutoscaler, como a documentação do Kubernetes o descreve:
//   desejadas = teto(atuais × valor atual da métrica / valor desejado)
// com a tolerância de 10%, as réplicas que ainda não estão prontas contadas como 0%
// quando o cálculo pede para subir, a janela de estabilização na descida e as
// políticas padrão de subida (o maior entre dobrar e somar 4 a cada 15 s).
export const TOLERANCIA = 0.1;

export type Medicao = {
  atuais: number; // réplicas que existem (spec.replicas)
  usoProntas: number[]; // % da CPU pedida, uma por réplica pronta
  naoProntas: number; // réplicas criadas que ainda não estão prontas
};

// A recomendação de um ciclo, antes dos limites e da estabilização
export function recomendar(m: Medicao, alvo: number): number {
  const prontas = m.usoProntas.length;
  if (prontas === 0) return m.atuais; // sem métricas, não decide nada
  const media = m.usoProntas.reduce((a, b) => a + b, 0) / prontas;
  let razao = media / alvo;
  if (Math.abs(razao - 1) <= TOLERANCIA) return m.atuais;
  let base = prontas;
  if (razao > 1 && m.naoProntas > 0) {
    // conservador: as que ainda sobem entram na média com 0%
    base = prontas + m.naoProntas;
    const nova = (media * prontas) / base / alvo;
    // se a correção inverter o sentido ou cair na tolerância, não muda nada
    if (nova <= 1 || Math.abs(nova - 1) <= TOLERANCIA) return m.atuais;
    razao = nova;
  }
  return Math.ceil(razao * base);
}

export type Hpa = {
  minimo: number;
  maximo: number;
  alvo: number;
  janelaReducao: number;
};

// O controlador: guarda as recomendações recentes para estabilizar a descida
export class ControladorHpa {
  #historico: { t: number; valor: number }[] = [];
  readonly cfg: Hpa;
  constructor(cfg: Hpa) {
    this.cfg = cfg;
  }

  // t em segundos; devolve o novo número de réplicas. O mínimo pode mudar com a
  // hora, como na pré-escala do dia 5
  ciclo(t: number, m: Medicao, minimo = this.cfg.minimo): number {
    const rec = recomendar(m, this.cfg.alvo);
    this.#historico.push({ t, valor: rec });
    this.#historico = this.#historico.filter((h) => h.t > t - this.cfg.janelaReducao);
    let desejadas = rec;
    if (rec < m.atuais) {
      // descer só até a maior recomendação da janela
      desejadas = Math.min(m.atuais, Math.max(...this.#historico.map((h) => h.valor)));
    } else if (rec > m.atuais) {
      // políticas padrão de subida: 100% ou 4 réplicas por período, a maior
      desejadas = Math.min(rec, Math.max(m.atuais * 2, m.atuais + 4));
    }
    return Math.max(minimo, Math.min(this.cfg.maximo, desejadas));
  }
}
