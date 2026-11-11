// A versão "isolamento": duas saídas do fundo de reserva, intercaladas sempre na
// mesma ordem, em três níveis de isolamento. Cada transação confere o saldo antes
// de registrar a sua saída, e mesmo assim o saldo pode ficar negativo.
import fs from "node:fs";
import path from "node:path";
import type pg from "pg";
import { conectar, recriarEsquema } from "./banco.ts";
import { inserirSaida, prepararFundo, reais, saldo } from "./fundo.ts";
import { aplicarMigracoes } from "./migracoes.ts";

const dados = process.argv[2];
const url = process.env.BANCO_URL!;
const banco = await conectar(url);
await recriarEsquema(banco);
await aplicarMigracoes(banco, path.join(dados, "migracoes"));

const registro: string[] = [];
const FALHA_DE_SERIALIZACAO = "40001";

// Uma saída inteira, sem intercalação: usada na nova tentativa
async function tentarDeNovo(
  t: pg.Client,
  nivel: string,
  valor: number,
  motivo: string,
) {
  await t.query(`BEGIN ISOLATION LEVEL ${nivel}`);
  const lido = await saldo(t, 1);
  registro.push(`T2 lê o saldo: ${reais(lido)}`);
  if (lido < valor) {
    registro.push(`T2 recusa a saída de ${reais(valor)}: saldo insuficiente`);
    await t.query("ROLLBACK");
    return;
  }
  await inserirSaida(t, 1, valor, motivo);
  await t.query("COMMIT");
  registro.push(`T2 registra a saída de ${reais(valor)} e confirma`);
}

for (const nivel of ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"]) {
  registro.push(`== ${nivel}`);
  await prepararFundo(banco);
  const t1 = await conectar(url);
  const t2 = await conectar(url);
  await t1.query(`BEGIN ISOLATION LEVEL ${nivel}`);
  await t2.query(`BEGIN ISOLATION LEVEL ${nivel}`);
  registro.push("T1 e T2 começam");
  const lido1 = await saldo(t1, 1);
  registro.push(`T1 lê o saldo: ${reais(lido1)}`);
  const lido2 = await saldo(t2, 1);
  registro.push(`T2 lê o saldo: ${reais(lido2)}`);
  if (lido1 >= 70000) {
    await inserirSaida(t1, 1, 70000, "conserto do portão");
    registro.push(`T1 registra a saída de ${reais(70000)}`);
  }
  if (lido2 >= 60000) {
    await inserirSaida(t2, 1, 60000, "pintura da fachada");
    registro.push(`T2 registra a saída de ${reais(60000)}`);
  }
  await t1.query("COMMIT");
  registro.push("T1 confirma");
  try {
    await t2.query("COMMIT");
    registro.push("T2 confirma");
  } catch (erro) {
    if ((erro as { code?: string }).code !== FALHA_DE_SERIALIZACAO) throw erro;
    registro.push("T2 não confirma: falha de serialização; tenta de novo");
    await t2.query("ROLLBACK");
    await tentarDeNovo(t2, nivel, 60000, "pintura da fachada");
  }
  await t1.end();
  await t2.end();
  const final = await saldo(banco, 1);
  const aviso = final < 0 ? " (negativo: a regra foi violada)" : "";
  registro.push(`saldo final: ${reais(final)}${aviso}`, "");
}
await banco.end();

const saida = path.join(dados, "saida", "isolamento");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "execucao.txt"), registro.join("\n"));
console.log("isolamento: três níveis executados");
