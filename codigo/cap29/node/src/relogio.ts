// Um relógio simulado: dormir(ms) não espera de verdade; o relógio salta direto para o
// próximo evento. Seis segundos de tráfego rodam numa fração de segundo, e o resultado
// é o mesmo a cada execução.
export class Relogio {
  agora = 0;
  #eventos: { quando: number; ordem: number; acordar: () => void }[] = [];
  #ordem = 0;

  dormir(ms: number): Promise<void> {
    return new Promise((acordar) => {
      this.#eventos.push({ quando: this.agora + ms, ordem: this.#ordem++, acordar });
    });
  }

  // Acorda os eventos em ordem de horário até não restar nenhum
  async rodar(): Promise<void> {
    for (;;) {
      // deixa as promessas já resolvidas andarem antes do próximo evento
      await new Promise((r) => setImmediate(r));
      if (this.#eventos.length === 0) return;
      let i = 0;
      for (let j = 1; j < this.#eventos.length; j++) {
        const a = this.#eventos[j];
        const b = this.#eventos[i];
        if (a.quando < b.quando || (a.quando === b.quando && a.ordem < b.ordem)) i = j;
      }
      const [proximo] = this.#eventos.splice(i, 1);
      this.agora = proximo.quando;
      proximo.acordar();
    }
  }
}

// Gerador pseudoaleatório com semente (mulberry32): o mesmo sorteio a cada execução
export function gerador(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
