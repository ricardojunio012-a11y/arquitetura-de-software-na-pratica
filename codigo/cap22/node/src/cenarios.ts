// Os cenários que passam pelo balanceador. Um síndico faz login e abre o painel
// várias vezes, um pedido depois do outro, e cada resposta diz que réplica atendeu.
import fs from "node:fs";
import path from "node:path";

const [dados, cenario] = process.argv.slice(2);
const BALANCEADOR = "http://balanceador";
const REPLICAS = ["api1", "api2", "api3"];
const admin = (replica: string, rota: string) =>
  fetch(`http://${replica}:3001${rota}`).then((r) => r.text());

// Prepara as réplicas: todas no ar, contadores zerados, sessões no lugar escolhido
const modo = cenario === "sessao-memoria" ? "memoria" : "redis";
for (const r of REPLICAS) {
  await admin(r, "/religar");
  await admin(r, `/modo?sessao=${modo}`);
}
// Espera o balanceador voltar a usar todas as réplicas (o fail_timeout é de 30 s)
await new Promise((ok) => setTimeout(ok, 31_000));
for (const r of REPLICAS) await admin(r, "/zerar");

const login = await fetch(`${BALANCEADOR}/login`, { method: "POST" });
const sid = login.headers.get("set-cookie")!.split(";")[0];

const linhas: string[] = [`cenário: ${cenario}`, "1 login"];
const status = new Map<string, number>();
const pedidos = cenario === "queda" ? 30 : 9;
let antesDaQueda: number[] = [];
for (let i = 1; i <= pedidos; i++) {
  if (cenario === "queda" && i === 11) {
    antesDaQueda = await Promise.all(
      REPLICAS.map((r) => admin(r, "/zerar").then(Number)),
    );
    await admin("api2", "/desligar");
    linhas.push("depois do 10º pedido: api2 deixa de aceitar conexões");
  }
  const r = await fetch(`${BALANCEADOR}/painel`, { headers: { cookie: sid } });
  status.set(String(r.status), (status.get(String(r.status)) ?? 0) + 1);
}

const contagem = await Promise.all(
  REPLICAS.map((r) => admin(r, "/zerar").then(Number)),
);
linhas.push(
  `${pedidos} pedidos ao painel: ` +
    [...status]
      .sort()
      .map(([s, n]) => `${n} com status ${s}`)
      .join(", "),
);
if (cenario === "queda") {
  const antes = antesDaQueda.sort((a, b) => b - a).join(", ");
  linhas.push(
    `antes da queda, pedidos por réplica (com o login): ${antes}`,
    `depois da queda: api2 atendeu ${contagem[1]}; ` +
      `api1 e api3 atenderam ${contagem[0] + contagem[2]}`,
  );
} else {
  const ordenada = [...contagem].sort((a, b) => b - a);
  linhas.push(`pedidos por réplica, com o login: ${ordenada.join(", ")}`);
}

await admin("api2", "/religar");
const saida = path.join(dados, "saida", cenario);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
