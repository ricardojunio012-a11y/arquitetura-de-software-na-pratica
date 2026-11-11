// A versão "pagamento": o morador toca duas vezes no botão "pagar", e os dois pedidos
// chegam juntos, cada um por uma conexão. Primeiro sem chave de idempotência, depois
// com a mesma chave nos dois.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { pagar } from "./pagar.ts";

const dados = process.argv[2];
const conectar = async () => {
  const c = new pg.Client({ connectionString: process.env.BANCO_URL });
  await c.connect();
  return c;
};
const admin = await conectar();
await admin.query(fs.readFileSync(path.join(dados, "sql", "esquema.sql"), "utf8"));
const [a, b] = await Promise.all([conectar(), conectar()]);

const linhas: string[] = [];
for (const [nome, cobranca, chave] of [
  ["sem chave de idempotência", "C-301", null],
  ["com a mesma chave nos dois toques", "C-302", "toque-7f3a"],
] as const) {
  const ids = await Promise.all([
    pagar(a, cobranca, 45000, chave),
    pagar(b, cobranca, 45000, chave),
  ]);
  const { rows } = await admin.query(
    "SELECT count(*)::integer AS n FROM pagamentos WHERE cobranca = $1",
    [cobranca],
  );
  const respostas = ids[0] === ids[1] ? "o mesmo pagamento" : "pagamentos diferentes";
  linhas.push(
    `${nome}\n  ${rows[0].n} pagamento(s) da ${cobranca}; ` +
      `as duas respostas trazem ${respostas}`,
  );
}

await Promise.all([admin.end(), a.end(), b.end()]);
const saida = path.join(dados, "saida", "pagamento");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
