// A versão "replica": o morador paga a cobrança, e a leitura na réplica, atrasada,
// ainda mostra "aberta". A correção é ler o que se escreveu: depois de gravar, a
// aplicação só lê da réplica quando ela já aplicou a gravação; senão, lê do primário.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const dados = process.argv[2];
const primario = new pg.Client({ connectionString: process.env.PRIMARIO_URL });
const replica = new pg.Client({ connectionString: process.env.REPLICA_URL });
await Promise.all([primario.connect(), replica.connect()]);
const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function situacao(banco: pg.Client) {
  try {
    const { rows } = await banco.query(
      "SELECT situacao FROM cobrancas WHERE id = 'C-1'",
    );
    return rows[0]?.situacao ?? "(sem a cobrança)";
  } catch (erro) {
    // Numa segunda execução, a réplica atrasada pode aplicar o DROP da tabela antiga
    // entre duas leituras: para quem espera a cobrança nova, é o mesmo que não tê-la
    if ((erro as { code?: string }).code === "42P01") return "(sem a cobrança)";
    throw erro;
  }
}

// Lê o que escreveu: a réplica serve se já aplicou o ponto do log (LSN) da gravação
async function lerDepoisDeGravar(lsn: string) {
  for (let i = 0; i < 5; i++) {
    const { rows } = await replica.query(
      "SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn AS alcancou",
      [lsn],
    );
    if (rows[0].alcancou) return `${await situacao(replica)} (lido na réplica)`;
    await esperar(100);
  }
  return `${await situacao(primario)} (réplica atrasada; lido no primário)`;
}

// Prepara: uma cobrança aberta, já copiada para a réplica
await primario.query("DROP TABLE IF EXISTS cobrancas");
await primario.query("CREATE TABLE cobrancas (id text PRIMARY KEY, situacao text)");
await primario.query("INSERT INTO cobrancas VALUES ('C-1', 'aberta')");
while (
  (await replica.query("SELECT to_regclass('cobrancas') AS t")).rows[0].t === null ||
  (await situacao(replica)) !== "aberta"
) {
  await esperar(200);
}

const linhas = ["antes do pagamento, na réplica: aberta"];
await primario.query("UPDATE cobrancas SET situacao = 'paga' WHERE id = 'C-1'");
const { rows } = await primario.query("SELECT pg_current_wal_lsn() AS lsn");
const lsn = rows[0].lsn;
linhas.push(
  "o morador paga (gravado no primário)",
  `logo depois, lendo na réplica: ${await situacao(replica)}`,
  `logo depois, lendo no primário: ${await situacao(primario)}`,
  `logo depois, lendo o que escreveu: ${await lerDepoisDeGravar(lsn)}`,
);
// Espera a réplica alcançar o primário e lê de novo
while ((await situacao(replica)) !== "paga") await esperar(200);
linhas.push(`depois que a réplica alcançou: ${await lerDepoisDeGravar(lsn)}`);

await Promise.all([primario.end(), replica.end()]);
const saida = path.join(dados, "saida", "replica");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
