// As versões "cache-aside" e "estouro", com o Redis e o PostgreSQL de verdade.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient, type RedisClientType } from "redis";
import { type Painel, PainelComCache, pegarTrava, soltarTrava } from "./painel.ts";

const [dados, cenario] = process.argv.slice(2);
const banco = new pg.Pool({ connectionString: process.env.BANCO_URL, max: 10 });
await banco.query(fs.readFileSync(path.join(dados, "sql", "dados.sql"), "utf8"));
const redis = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
await redis.connect();
await redis.flushAll();

let consultas = 0;
async function origem(condominio: number): Promise<Painel> {
  consultas++;
  const { rows } = await banco.query(
    "SELECT recebido_centavos::integer, em_aberto_centavos::integer " +
      "FROM painel_financeiro($1)",
    [condominio],
  );
  return rows[0];
}
const painel = new PainelComCache(redis, origem);
const reais = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const mostrar = (p: Painel) =>
  `recebido R$ ${reais(p.recebido_centavos)}, ` +
  `em aberto R$ ${reais(p.em_aberto_centavos)}`;

const linhas: string[] = [];
if (cenario === "cache-aside") {
  linhas.push(
    `1º pedido: ${mostrar(await painel.comPromessa(12))} (consultas: ${consultas})`,
  );
  for (let i = 0; i < 5; i++) await painel.comPromessa(12);
  linhas.push(`mais 5 pedidos, do cache (consultas: ${consultas})`);
  await banco.query(
    "UPDATE cobrancas SET situacao = 'paga' " +
      "WHERE id = (SELECT min(id) FROM cobrancas WHERE situacao = 'aberta')",
  );
  linhas.push(`sem invalidar: ${mostrar(await painel.comPromessa(12))} (velho)`);
  await painel.invalidar(12);
  linhas.push(
    `depois de invalidar: ${mostrar(await painel.comPromessa(12))} ` +
      `(consultas: ${consultas})`,
  );
} else {
  const estrategias: [string, (c: number) => Promise<Painel>][] = [
    ["sem proteção", (c) => painel.semProtecao(c)],
    ["promessa compartilhada", (c) => painel.comPromessa(c)],
    ["trava no Redis", (c) => painel.comTrava(c)],
  ];
  linhas.push("200 pedidos ao mesmo tempo, com a chave fora do cache:");
  for (const [nome, buscar] of estrategias) {
    await redis.flushAll();
    consultas = 0;
    const respostas = await Promise.all(Array.from({ length: 200 }, () => buscar(12)));
    const iguais = new Set(respostas.map((r) => JSON.stringify(r))).size === 1;
    linhas.push(
      `  ${nome.padEnd(23)} ${String(consultas).padStart(3)} ` +
        `${consultas === 1 ? "consulta" : "consultas"} ao banco` +
        `${iguais ? ", todas as respostas iguais" : ""}`,
    );
  }

  // A trava precisa de dono: a carga de A passa do prazo, a trava vence e B a pega.
  // Quando A termina, ele solta a trava de dois jeitos
  linhas.push("", "trava com prazo de 100 ms e uma carga de 200 ms:");
  for (const comDono of [false, true]) {
    await redis.flushAll();
    const a = (await pegarTrava(redis, "trava:teste", 100))!;
    await new Promise((ok) => setTimeout(ok, 200));
    const b = await pegarTrava(redis, "trava:teste", 5000);
    if (comDono) await soltarTrava(redis, "trava:teste", a);
    else await redis.del("trava:teste");
    const deB = b !== null && (await redis.get("trava:teste")) === b;
    linhas.push(
      comDono
        ? `  comparar e apagar (Lua) ${deB ? "a trava de B continua com B" : "ERRO"}`
        : `  apagar sem conferir     ${deB ? "ERRO" : "A apagou a trava de B"}`,
    );
  }
}

await Promise.all([banco.end(), redis.quit()]);
const saida = path.join(dados, "saida", cenario);
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
