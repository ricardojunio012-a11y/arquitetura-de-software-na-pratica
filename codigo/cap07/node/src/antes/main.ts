// Uso: node main.ts <comandos.json> <pasta-de-saída>
import fs from "node:fs";
import path from "node:path";
import { reservas } from "./modelo.ts";
import { cancelar, reservar } from "./servico.ts";

const [entrada, saida] = process.argv.slice(2);
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const eventos: string[] = [];
const resultados = dados.comandos.map((c: any) => {
  const espaco = dados.espacos.find((e: any) => e.id === c.espaco);
  const r = c.tipo === "reservar" ? reservar(c, espaco, eventos) : cancelar(c, eventos);
  return `${c.reserva};${c.tipo};${r}`;
});
const agenda = dados.espacos.flatMap((e: any) =>
  reservas
    .filter((r) => r.espaco === e.id && r.situacao === "confirmada")
    .map((r) => `${r.espaco};${r.id};${r.data} ${r.inicio}h-${r.fim}h;${r.unidade}`),
);

fs.mkdirSync(saida, { recursive: true });
for (const [nome, linhas] of Object.entries({ resultados, eventos, agenda })) {
  fs.writeFileSync(
    path.join(saida, `${nome}.txt`),
    (linhas as string[]).join("\n") + "\n",
  );
}
console.log(`${resultados.length} comandos executados; saída em ${saida}`);
