// A versão "promocao" (agora a parte difícil): a rede entre o líder e a candidata é
// cortada, e o monitor, sem enxergar o líder, promove a candidata. Os dois lados
// aceitam escritas (split brain). Quando a rede volta, o sistema segue o novo líder, e
// a escrita que o líder antigo confirmou ao síndico não existe mais.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const conectar = async (url: string) => {
  for (;;) {
    const c = new pg.Client({ connectionString: url });
    try {
      await c.connect();
      return c;
    } catch {
      await esperar(500);
    }
  }
};
const lider = await conectar(process.env.PRIMARIO_URL!);
let candidata = await conectar(process.env.CANDIDATA_URL!);

async function rede(ligada: boolean) {
  await fetch(`${process.env.TOXIPROXY_URL}/proxies/candidata`, {
    method: "POST",
    body: JSON.stringify({ enabled: ligada }),
  });
}
async function silencio(banco: pg.Client) {
  const { rows } = await banco.query("SELECT inicio FROM regras WHERE condominio = 12");
  return rows[0]?.inicio ?? "(sem a regra)";
}
async function emRecuperacao(banco: pg.Client) {
  const { rows } = await banco.query("SELECT pg_is_in_recovery() AS r");
  return rows[0].r as boolean;
}

// Pede à candidata promovida que se reconstrua a partir do líder (veja
// banco/candidata.sh) e espera ela voltar como réplica, com o valor do líder
async function reconstruirCandidata(valor: string) {
  await rede(true);
  await candidata.query("CREATE TABLE reconstruir ()");
  await candidata.end().catch(() => {});
  for (;;) {
    await esperar(1000);
    candidata = await conectar(process.env.CANDIDATA_URL!);
    const pronta = await emRecuperacao(candidata).catch(() => false);
    if (pronta && (await silencio(candidata).catch(() => "")) === valor) return;
    await candidata.end().catch(() => {});
  }
}

// Prepara: replicação assíncrona, rede ligada, a candidata como réplica com 22h
await rede(true);
await lider.query("ALTER SYSTEM SET synchronous_standby_names = ''");
await lider.query("SELECT pg_reload_conf()");
await lider.query("DROP TABLE IF EXISTS regras");
await lider.query("CREATE TABLE regras (condominio integer PRIMARY KEY, inicio text)");
await lider.query("INSERT INTO regras VALUES (12, '22h')");
if (!(await emRecuperacao(candidata))) await reconstruirCandidata("22h");
while ((await silencio(candidata).catch(() => "")) !== "22h") await esperar(200);

const linhas = ["promoção durante a partição", "antes: líder 22h, candidata 22h"];
await rede(false);
linhas.push("a rede entre o líder e a candidata é cortada");

await lider.query("UPDATE regras SET inicio = '23h' WHERE condominio = 12");
linhas.push("escrita no líder antigo (23h): confirmada ao síndico");

// O monitor não enxerga o líder e promove a candidata. Ninguém cerca o líder antigo,
// que continua aceitando escritas de quem ainda o alcança
const { rows } = await candidata.query("SELECT pg_promote(true, 60) AS ok");
linhas.push(`a candidata é promovida a líder: ${rows[0].ok ? "sim" : "não"}`);
await candidata.query("UPDATE regras SET inicio = '21h' WHERE condominio = 12");
linhas.push(
  "escrita no novo líder (21h): confirmada a outro usuário",
  `dois líderes: o antigo diz ${await silencio(lider)}, ` +
    `o novo diz ${await silencio(candidata)}`,
);

await rede(true);
await esperar(2000);
linhas.push(
  "a rede volta",
  "a candidata voltou a seguir o líder antigo? " +
    ((await emRecuperacao(candidata)) ? "sim" : "não (está numa nova linha do tempo)"),
  `o sistema passa a seguir o novo líder: ${await silencio(candidata)}`,
  "a escrita de 23h, confirmada ao síndico, se perdeu",
);

await reconstruirCandidata(await silencio(lider));
await Promise.all([lider.end(), candidata.end()]);
const saida = path.join(process.argv[2], "saida", "promocao");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
