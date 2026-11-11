// A versão "reservas": 20 moradores pedem a churrasqueira no mesmo instante, para o
// sábado das 12h às 16h (metade deles para as 13h às 17h, que se sobrepõe). Cada
// pedido usa a sua própria conexão, como pedidos que chegam a réplicas diferentes.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import {
  type Pedido,
  reservarComRestricao,
  reservarIngenuo,
  reservarOtimista,
} from "./reservar.ts";

const dados = process.argv[2];
const conectar = async () => {
  const c = new pg.Client({ connectionString: process.env.BANCO_URL });
  await c.connect();
  return c;
};
const admin = await conectar();
await admin.query(fs.readFileSync(path.join(dados, "sql", "esquema.sql"), "utf8"));

const pedidos: Pedido[] = Array.from({ length: 20 }, (_, i) => ({
  morador: `morador ${i + 1}`,
  inicio: i % 2 === 0 ? "2026-11-07 12:00" : "2026-11-07 13:00",
  fim: i % 2 === 0 ? "2026-11-07 16:00" : "2026-11-07 17:00",
}));
const conexoes = await Promise.all(pedidos.map(() => conectar()));

const formas: [string, string, typeof reservarIngenuo][] = [
  ["confere e insere", "reservas_ingenuas", reservarIngenuo],
  ["bloqueio otimista", "reservas_otimistas", reservarOtimista],
  ["restrição de exclusão", "reservas", reservarComRestricao],
];
const linhas = ["20 pedidos simultâneos para a churrasqueira no sábado à tarde"];
for (const [nome, tabela, reservar] of formas) {
  const aceitos = await Promise.all(pedidos.map((p, i) => reservar(conexoes[i], p)));
  const { rows } = await admin.query(`SELECT count(*)::integer AS n FROM ${tabela}`);
  const n = rows[0].n;
  const quantas = n === 1 ? "1 reserva" : "mais de uma reserva para o mesmo horário";
  linhas.push(
    `  ${nome.padEnd(22)} ${quantas}` +
      (n === 1 ? `; ${aceitos.filter((a) => !a).length} pedidos recusados` : ""),
  );
}

await Promise.all([admin.end(), ...conexoes.map((c) => c.end())]);
const saida = path.join(dados, "saida", "reservas");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
