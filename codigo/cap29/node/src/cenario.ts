// O cenário: seis segundos de tráfego no Morada, com 20 pagamentos e 50 consultas de
// avisos por segundo, num servidor com 16 trabalhadores. Os avisos não dependem do
// gateway de pagamento; os pagamentos, sim.
import {
  Anteparo,
  comNovasTentativas,
  comTempoLimite,
  Disjuntor,
  Trabalhadores,
} from "./protecoes.ts";
import { gerador, Relogio } from "./relogio.ts";

export interface Protecoes {
  limiteMs?: number;
  tentativas?: number;
  disjuntor?: boolean;
  anteparo?: number;
}

export interface Resultado {
  avisosRapidos: number; // respondidos em até 200 ms
  maiorEsperaAviso: number;
  pagamentosConfirmados: number;
  chamadasAoGateway: number;
}

export const AVISOS = 300;
export const PAGAMENTOS = 120;

export async function simular(p: Protecoes): Promise<Resultado> {
  const relogio = new Relogio();
  const sortearFalha = gerador(2029);
  const sortearEspera = gerador(7);
  let chamadasAoGateway = 0;
  const cobrados = new Set<string>();

  // O gateway: normal até 1 s; fora do ar até 4 s (não responde por 5 s); depois,
  // instável, com metade das chamadas falhando na hora. Como um gateway real, ele é
  // idempotente pela chave: uma chave já cobrada devolve "aprovado" sem cobrar de novo.
  // Nas falhas deste cenário, o gateway não chega a cobrar; num tempo limite real, ele
  // pode ter cobrado, e é a chave que torna a nova tentativa segura.
  async function gateway(chave: string): Promise<string> {
    chamadasAoGateway++;
    if (cobrados.has(chave)) return "aprovado";
    const t = relogio.agora;
    if (t >= 1000 && t < 4000) {
      await relogio.dormir(5000);
      throw new Error("sem resposta");
    }
    if (t >= 4000 && sortearFalha() < 0.5) {
      await relogio.dormir(20);
      throw new Error("503");
    }
    await relogio.dormir(50);
    cobrados.add(chave);
    return "aprovado";
  }

  // As proteções, de dentro para fora: tempo limite, disjuntor, novas tentativas e
  // anteparo
  const disjuntor = p.disjuntor
    ? new Disjuntor(relogio, {
        janela: 20,
        minimo: 10,
        limiar: 0.8,
        pausaMs: 1000,
        testes: 4,
      })
    : null;
  const anteparo = p.anteparo ? new Anteparo(p.anteparo) : null;
  // A chave de idempotência nasce uma vez por pagamento e acompanha todas as tentativas
  const comLimite = (chave: string) =>
    p.limiteMs
      ? comTempoLimite(relogio, p.limiteMs, () => gateway(chave))
      : gateway(chave);
  const umaTentativa = (chave: string) =>
    disjuntor ? disjuntor.chamar(() => comLimite(chave)) : comLimite(chave);
  const cobrar = (chave: string) =>
    comNovasTentativas(relogio, () => umaTentativa(chave), {
      tentativas: p.tentativas ?? 1,
      baseMs: 100,
      sortear: sortearEspera,
    });
  const pagar = (chave: string) =>
    anteparo ? anteparo.chamar(() => cobrar(chave)) : cobrar(chave);

  const servidor = new Trabalhadores(16);
  const esperas: number[] = [];
  let confirmados = 0;
  async function chegar(tipo: "aviso" | "pagamento", quando: number) {
    await relogio.dormir(quando);
    const chegada = relogio.agora;
    await servidor.executar(async () => {
      await relogio.dormir(5); // o trabalho do próprio Morada
      if (tipo === "pagamento") {
        try {
          await pagar(`pagamento-${quando}`);
          confirmados++;
        } catch {
          // o morador vê "não foi possível pagar agora"
        }
      }
    });
    if (tipo === "aviso") esperas.push(relogio.agora - chegada);
  }

  const pedidos: Promise<void>[] = [];
  for (let t = 0; t < 6000; t += 50) pedidos.push(chegar("pagamento", t));
  for (let t = 0; t < 6000; t += 20) pedidos.push(chegar("aviso", t));
  await relogio.rodar();
  await Promise.all(pedidos);
  return {
    avisosRapidos: esperas.filter((e) => e <= 200).length,
    maiorEsperaAviso: Math.max(...esperas),
    pagamentosConfirmados: confirmados,
    chamadasAoGateway,
  };
}
