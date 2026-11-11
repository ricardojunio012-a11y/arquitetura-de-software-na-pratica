// A versão "vazamento": o síndico do condomínio 12 abre o relatório de
// inadimplentes, primeiro sem RLS e depois com RLS. Depois, a administradora 3, que
// administra os condomínios 12 e 15, abre o mesmo relatório. A consulta com defeito é
// a mesma em todos os casos.
import fs from "node:fs";
import path from "node:path";
import { comoAdministradora, comoCondominio, conectar } from "./banco.ts";
import { inadimplentes, type Inadimplente } from "./relatorio.ts";

const dados = process.argv[2];
const sql = (arquivo: string) =>
  fs.readFileSync(path.join(dados, "sql", arquivo), "utf8");
const admin = await conectar(process.env.BANCO_URL!);
await admin.query(sql("esquema.sql"));
const app = await conectar(process.env.APP_BANCO_URL!);
const SINDICO = 12;
const ADMINISTRADORA = 3; // administra os condomínios 12 e 15
const RECUSADO_PELA_POLITICA = "42501";

const registro: string[] = [];
let passo = 0;
function mostrar(titulo: string, linhas: Inadimplente[], permitidos = [SINDICO]) {
  registro.push(`${++passo}. ${titulo}`);
  for (const l of linhas) {
    const alerta = permitidos.includes(l.condominio_id) ? "" : "  <- outro condomínio";
    registro.push(
      `   condomínio ${l.condominio_id} | unidade ${l.unidade} | ${l.morador} | ` +
        `${l.valor_centavos} centavos${alerta}`,
    );
  }
  if (linhas.length === 0) registro.push("   nenhuma linha");
  const vazadas = linhas.filter((l) => !permitidos.includes(l.condominio_id)).length;
  registro.push(`   linhas de outros condomínios: ${vazadas}`, "");
}

mostrar(
  "relatório do síndico do condomínio 12, sem RLS",
  await comoCondominio(app, SINDICO, () => inadimplentes(app)),
);
await admin.query(sql("rls.sql"));
mostrar(
  "o mesmo relatório, com RLS",
  await comoCondominio(app, SINDICO, () => inadimplentes(app)),
);
mostrar(
  "com RLS, numa transação sem condomínio definido",
  await comoCondominio(app, null, () => inadimplentes(app)),
);

registro.push(`${++passo}. com RLS, o condomínio 12 tenta gravar uma cobrança do 15`);
try {
  await comoCondominio(app, SINDICO, () =>
    app.query(
      "INSERT INTO cobrancas " +
        "(condominio_id, unidade, morador, valor_centavos, situacao) " +
        "VALUES (15, '13', 'Hugo Dias', 38000, 'aberta')",
    ),
  );
  registro.push("   gravada");
} catch (erro) {
  if ((erro as { code?: string }).code !== RECUSADO_PELA_POLITICA) throw erro;
  registro.push("   recusada pelo banco: a linha não passa na política de RLS");
}

mostrar(
  "com RLS, a administradora 3, que administra os condomínios 12 e 15",
  await comoAdministradora(app, ADMINISTRADORA, () => inadimplentes(app)),
  [12, 15],
);
registro.push(
  `${++passo}. com RLS, a administradora 3 tenta gravar uma cobrança do 20`,
);
try {
  await comoAdministradora(app, ADMINISTRADORA, () =>
    app.query(
      "INSERT INTO cobrancas " +
        "(condominio_id, unidade, morador, valor_centavos, situacao) " +
        "VALUES (20, 'A-5', 'Hugo Dias', 61000, 'aberta')",
    ),
  );
  registro.push("   gravada");
} catch (erro) {
  if ((erro as { code?: string }).code !== RECUSADO_PELA_POLITICA) throw erro;
  registro.push("   recusada pelo banco: a linha não passa em nenhuma política");
}
await Promise.all([admin.end(), app.end()]);

const saida = path.join(dados, "saida", "vazamento");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "relatorio.txt"), registro.join("\n") + "\n");
console.log("vazamento: seis passos executados");
