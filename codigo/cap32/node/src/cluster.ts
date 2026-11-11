// Um cluster simulado em relógio lógico: a cada 15 s, mede a carga, roda o HPA,
// cria ou apaga réplicas, escalona as pendentes e, se faltar nó, pede outro.
import { PASSO } from "./carga.ts";
import { escolherNo, type No } from "./escalonador.ts";
import { ControladorHpa } from "./hpa.ts";
import type { Configuracao } from "./manifestos.ts";

// Premissas do laboratório (não são números de um provedor)
export const PREMISSAS = {
  pedidosPorPod: 50, // pedidos/s de uma réplica a 100% da CPU pedida
  tetoUso: 160, // % da CPU pedida que uma réplica alcança, sem limite de CPU
  cpuNo: 1600, // milicpu livres para a aplicação num nó de 2 vCPU
  baixarImagem: 30, // s para um nó novo baixar a imagem (uma vez por nó)
  partida: 30, // s da partida do processo até a prontidão responder
  subidaNo: 120, // s para um nó novo entrar no cluster
  ociosidadeNo: 600, // s de nó vazio até ser devolvido
  nosMinimo: 1,
  nosMaximo: 12,
};

type Pod = { nome: string; criado: number; no?: string; pronto?: number };
type NoSim = No & {
  criado: number;
  prontoEm: number;
  imagemEm?: number;
  vazio?: number;
};

export type Cenario = {
  nome: string;
  fixas?: number | ((t: number) => number); // sem HPA: réplicas fixas ou planejadas
  minimo?: (t: number) => number; // com HPA: mínimo que muda com a hora
};

export type Linha = {
  t: number;
  carga: number;
  desejadas: number;
  prontas: number;
  pendentes: number;
  nos: number;
  uso: number;
  lentos: number;
  perdidos: number;
};

export type Resultado = {
  pedidos: number;
  lentos: number;
  perdidos: number;
  maxProntas: number;
  maxNos: number;
  noSegundos: number;
  podSegundos: number;
  linhas: Linha[];
};

export function simular(cfg: Configuracao, carga: number[], c: Cenario): Resultado {
  const p = PREMISSAS;
  const hpa = new ControladorHpa(cfg);
  const nos: NoSim[] = [];
  let pods: Pod[] = [];
  let contPods = 0;
  let contNos = 0;
  const novoNo = (t: number, pronto: boolean) => {
    const nome = `no-${String(++contNos).padStart(2, "0")}`;
    const prontoEm = pronto ? t : t + p.subidaNo;
    nos.push({
      nome,
      cpu: p.cpuNo,
      pedida: 0,
      pronto,
      criado: t,
      prontoEm,
      imagemEm: pronto ? t : undefined,
    });
  };
  const novoPod = (t: number) => pods.push({ nome: `api-${++contPods}`, criado: t });

  // Começa com as réplicas iniciais prontas, em nós prontos
  const fixas =
    typeof c.fixas === "function"
      ? c.fixas
      : c.fixas !== undefined
        ? () => c.fixas as number
        : undefined;
  const iniciais = fixas?.(0) ?? Math.max(cfg.minimo, c.minimo?.(0) ?? 0);
  for (let k = 0; k < iniciais; k++) novoPod(-PASSO);
  while (nos.length * Math.floor(p.cpuNo / cfg.cpuPorPod) < iniciais)
    novoNo(-PASSO, true);
  for (const pod of pods) {
    const no = escolherNo(nos, cfg.cpuPorPod)!;
    no.pedida += cfg.cpuPorPod;
    pod.no = no.nome;
    pod.pronto = -PASSO;
  }

  const r: Resultado = {
    pedidos: 0,
    lentos: 0,
    perdidos: 0,
    maxProntas: 0,
    maxNos: 0,
    noSegundos: 0,
    podSegundos: 0,
    linhas: [],
  };
  for (let k = 0; k < carga.length; k++) {
    const t = k * PASSO;
    // 1. nós e réplicas que terminaram de subir
    for (const n of nos) n.pronto = n.prontoEm <= t;
    const prontas = pods.filter((x) => x.pronto !== undefined && x.pronto <= t);
    // 2. a carga do momento, dividida pelo Service entre as réplicas prontas
    const pedidos = carga[k];
    const capacidade = (prontas.length * p.pedidosPorPod * p.tetoUso) / 100;
    const perdidos = Math.max(0, pedidos - capacidade) * PASSO;
    const uso = prontas.length
      ? Math.min(p.tetoUso, (pedidos / prontas.length / p.pedidosPorPod) * 100)
      : 0;
    // acima de 100% da CPU pedida, a réplica atende, mas devagar
    const lentos = uso > 100 ? pedidos * PASSO - perdidos : 0;
    // 3. o HPA (ou o número fixo) decide quantas réplicas devem existir
    const desejadas =
      fixas?.(t) ??
      hpa.ciclo(
        t,
        {
          atuais: pods.length,
          usoProntas: prontas.map(() => uso),
          naoProntas: pods.length - prontas.length,
        },
        c.minimo?.(t),
      );
    // 4. o ReplicaSet cria as que faltam ou apaga as que sobram: primeiro as sem
    // nó, depois as que não estão prontas, depois as mais novas
    while (pods.length < desejadas) novoPod(t);
    if (pods.length > desejadas) {
      const ordem = [...pods].sort(
        (a, b) =>
          Number(!!a.no) - Number(!!b.no) ||
          Number((a.pronto ?? Infinity) <= t) - Number((b.pronto ?? Infinity) <= t) ||
          b.criado - a.criado,
      );
      for (const sai of ordem.slice(0, pods.length - desejadas)) {
        const no = nos.find((n) => n.nome === sai.no);
        if (no) no.pedida -= cfg.cpuPorPod;
      }
      const saem = new Set(ordem.slice(0, pods.length - desejadas));
      pods = pods.filter((x) => !saem.has(x));
    }
    // 5. o escalonador coloca as pendentes, na ordem em que foram criadas
    for (const pod of pods.filter((x) => !x.no)) {
      const no = escolherNo(nos, cfg.cpuPorPod) as NoSim | undefined;
      if (!no) continue;
      no.pedida += cfg.cpuPorPod;
      pod.no = no.nome;
      no.imagemEm ??= t + p.baixarImagem; // as réplicas do nó esperam a mesma imagem
      pod.pronto = Math.max(t, no.imagemEm) + p.partida;
    }
    // 6. o autoescalonador de nós: pede nós para as pendentes que não cabem nos
    // que já estão subindo, e devolve os nós vazios há muito tempo
    const vagasPorNo = Math.floor(p.cpuNo / cfg.cpuPorPod);
    const pendentes = pods.filter((x) => !x.no).length;
    const chegando = nos.filter((n) => !n.pronto).length * vagasPorNo;
    let faltam = Math.ceil(Math.max(0, pendentes - chegando) / vagasPorNo);
    while (faltam-- > 0 && nos.length < p.nosMaximo) novoNo(t, false);
    for (const n of nos)
      n.vazio = n.pedida === 0 && n.pronto ? (n.vazio ?? t) : undefined;
    const ocioso = nos.find(
      (n) => n.vazio !== undefined && t - n.vazio >= p.ociosidadeNo,
    );
    if (ocioso && nos.length > p.nosMinimo) nos.splice(nos.indexOf(ocioso), 1);

    r.pedidos += pedidos * PASSO;
    r.perdidos += perdidos;
    r.lentos += lentos;
    r.maxProntas = Math.max(r.maxProntas, prontas.length);
    r.maxNos = Math.max(r.maxNos, nos.length);
    r.noSegundos += nos.length * PASSO; // o nó é cobrado desde que é pedido
    r.podSegundos += pods.length * PASSO;
    r.linhas.push({
      t,
      carga: pedidos,
      desejadas,
      prontas: prontas.length,
      pendentes,
      nos: nos.length,
      uso,
      lentos,
      perdidos,
    });
  }
  return r;
}
