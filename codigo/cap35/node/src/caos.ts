// Cenário "caos": derrubar réplicas da API de avisos durante o tráfego e
// conferir a hipótese de estado estável.
import http from "node:http";
import { Relato } from "./comum.ts";
import { Balanceador, type Replica } from "./balanceador.ts";
import * as disp from "./disponibilidade.ts";

const relato = new Relato(process.argv[2], "caos");
const PEDIDOS = 1000;
const QUEDA = 500; // a falha é injetada depois deste pedido
const HIPOTESE = 0.999;

const r1 = { nome: "api-1", zona: "a" };
const r2 = { nome: "api-2", zona: "a" };
const r3 = { nome: "api-3", zona: "b" };
const todas = [r1, r2, r3];

// Uma conexão nova por pedido (agent: false), para a réplica derrubada
// recusar na hora, sem conexões antigas reaproveitadas
const pedirHttp = (host: string, porta: number, caminho: string) =>
  new Promise<boolean>((ok) => {
    const p = http.get({ host, port: porta, path: caminho, agent: false }, (res) => {
      res.resume();
      res.on("end", () => ok(res.statusCode === 200));
    });
    p.setTimeout(1000, () => p.destroy());
    p.on("error", () => ok(false));
  });

const transporte = (r: Replica) => pedirHttp(r.nome, 8080, "/avisos");
const administrar = async (rs: Replica[], acao: string) => {
  for (const r of rs) await pedirHttp(r.nome, 9090, `/caos/${acao}`);
};

async function experimento(
  nome: string,
  replicas: Replica[],
  tentarOutra: boolean,
  derrubar: Replica[],
): Promise<void> {
  await administrar(todas, "restaurar");
  const lb = new Balanceador(replicas, transporte, tentarOutra);
  let respondidos = 0;
  for (let i = 1; i <= PEDIDOS; i++) {
    if (i === QUEDA + 1) await administrar(derrubar, "derrubar");
    if (await lb.pedir()) respondidos++;
  }
  await administrar(todas, "restaurar");
  const d = respondidos / PEDIDOS;
  const hipotese = d >= HIPOTESE ? "mantida" : "refutada";
  const resultado = `${respondidos} de ${PEDIDOS}`.padStart(12);
  relato.dizer(
    `${nome.padEnd(46)}${resultado}${disp.porcento(d, 1).padStart(8)}  ${hipotese}`,
  );
}

relato.dizer(`Morada: experimento de caos na API de avisos (${PEDIDOS} pedidos cada)`);
relato.dizer("Hipótese de estado estável: pelo menos 99,9% dos pedidos respondidos");
relato.dizer(`A falha é injetada depois do pedido ${QUEDA}.`);
relato.dizer();
const cabecalho = "experimento".padEnd(46) + "respondidos".padStart(12);
relato.dizer(`${cabecalho}${"disp.".padStart(8)}  hipótese`);
await experimento("linha de base: api-1 (a) e api-3 (b)", [r1, r3], false, []);
await experimento("api-1 cai; o balanceador não tenta outra", [r1, r3], false, [r1]);
await experimento("api-1 cai; o balanceador tenta a outra", [r1, r3], true, [r1]);
await experimento("zona a cai: api-1 (a) e api-2 (a)", [r1, r2], true, [r1, r2]);
await experimento("zona a cai: api-1 (a) e api-3 (b)", [r1, r3], true, [r1, r2]);

relato.dizer();
relato.dizer(
  "A conta da seção 35.1, com réplicas de 99,5% e zonas de 99,9% (premissas):",
);
const linha = (nome: string, p: number) =>
  relato.dizer(
    `  ${nome.padEnd(44)}${disp.porcento(p, 4).padStart(10)}` +
      `${disp.horasForaPorAno(p).toFixed(1).replace(".", ",").padStart(8)} h/ano`,
  );
linha("uma réplica", 0.995);
linha("duas réplicas independentes", disp.emParalelo([0.995, 0.995]));
linha("duas réplicas na mesma zona", disp.comComum(0.999, [0.995, 0.995]));
linha(
  "duas réplicas, cada uma na sua zona",
  disp.emParalelo([disp.emSerie([0.999, 0.995]), disp.emSerie([0.999, 0.995])]),
);
relato.gravar();
