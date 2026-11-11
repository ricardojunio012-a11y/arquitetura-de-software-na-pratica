// As versões "assincrona" e "sincrona": a rede entre o líder e a réplica é cortada
// pelo Toxiproxy, e o síndico muda o horário de silêncio do condomínio.
//  assincrona: o líder aceita a escrita na hora, e a réplica continua mostrando o
//              valor antigo enquanto a rede está cortada (disponível, inconsistente).
//  sincrona:   o líder só confirma a escrita quando a réplica a recebe; com a rede
//              cortada, a escrita fica esperando (consistente, indisponível).
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const [dados, versao] = process.argv.slice(2);
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const lider = new pg.Client({ connectionString: process.env.PRIMARIO_URL });
const replica = new pg.Client({ connectionString: process.env.REPLICA_URL });
await Promise.all([lider.connect(), replica.connect()]);

// Corta (ou religa) a rede entre o líder e as duas réplicas
async function rede(ligada: boolean) {
  for (const proxy of ["replicacao", "candidata"])
    await fetch(`${process.env.TOXIPROXY_URL}/proxies/${proxy}`, {
      method: "POST",
      body: JSON.stringify({ enabled: ligada }),
    });
}

async function silencio(banco: pg.Client) {
  const { rows } = await banco.query("SELECT inicio FROM regras WHERE condominio = 12");
  return rows[0]?.inicio ?? "(sem a regra)";
}

async function esperarReplica(valor: string) {
  while ((await silencio(replica).catch(() => "")) !== valor) await esperar(200);
}

// Prepara: replicação assíncrona, rede ligada, regra copiada para a réplica
await rede(true);
await lider.query("ALTER SYSTEM SET synchronous_standby_names = ''");
await lider.query("SELECT pg_reload_conf()");
await lider.query("DROP TABLE IF EXISTS regras");
await lider.query("CREATE TABLE regras (condominio integer PRIMARY KEY, inicio text)");
await lider.query("INSERT INTO regras VALUES (12, '22h')");
await esperarReplica("22h");
if (versao === "sincrona") {
  await lider.query("ALTER SYSTEM SET synchronous_standby_names = '*'");
  await lider.query("SELECT pg_reload_conf()");
}

const nome = versao === "sincrona" ? "síncrona" : "assíncrona";
const linhas = [`replicação ${nome}`, "antes: líder 22h, réplica 22h"];
await rede(false);
linhas.push("a rede entre o líder e a réplica é cortada");

// O síndico muda o silêncio para 23h; a escrita tem 2 segundos para ser confirmada
const escrita = lider.query("UPDATE regras SET inicio = '23h' WHERE condominio = 12");
const resultado = await Promise.race([
  escrita.then(() => "confirmada"),
  esperar(2000).then(() => "sem confirmação depois de 2 s (esperando a réplica)"),
]);
linhas.push(`escrita no líder: ${resultado}`);
if (resultado === "confirmada") {
  linhas.push(
    `leitura no líder: ${await silencio(lider)}`,
    `leitura na réplica: ${await silencio(replica)} (antiga)`,
  );
}

await rede(true);
await escrita;
await esperarReplica("23h");
linhas.push(
  "a rede volta",
  resultado === "confirmada"
    ? "a réplica alcança o líder"
    : "a réplica recebe a escrita, e o líder enfim a confirma",
  `depois: líder ${await silencio(lider)}, réplica ${await silencio(replica)}`,
);

await lider.query("ALTER SYSTEM SET synchronous_standby_names = ''");
await lider.query("SELECT pg_reload_conf()");
await Promise.all([lider.end(), replica.end()]);
const saida = path.join(dados, "saida", versao);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
