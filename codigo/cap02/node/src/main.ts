// Uso: node main.ts <cenarios.json>
// Roda cada cenário, imprime o relatório e termina com erro se algum falhar.
import fs from "node:fs";
import { executar, type Cenario } from "./cenarios.ts";

const numero = (n: number) => Math.round(n).toLocaleString("pt-BR");
const decimal = (n: number, casas: number) => n.toFixed(casas).replace(".", ",");

// 2,25 s | 4 min | 6 h 40 min
function duracao(segundos: number): string {
  if (segundos < 60) return `${decimal(segundos, 2)} s`;
  const minutos = Math.round(segundos / 60);
  const h = Math.floor(minutos / 60);
  if (h === 0) return `${minutos} min`;
  return minutos % 60 === 0 ? `${h} h` : `${h} h ${minutos % 60} min`;
}

const cenarios: Cenario[] = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const hoje = new Date("2026-03-02T00:00:00Z");
let falhas = 0;

for (const c of cenarios) {
  const r = executar(c, hoje);
  if (!r.passou) falhas++;
  const vazao = r.cobrancas / r.segundosCalculo;
  console.log(`${c.id}: ${c.descricao}`);
  console.log(
    `  cobranças: ${numero(r.cobrancas)}  meta: até ${duracao(c.limiteSegundos)}`,
  );
  console.log(
    `  cálculo (medido): ${duracao(r.segundosCalculo)}, ${numero(vazao)} por segundo`,
  );
  console.log(
    `  registro no banco (estimado, ${c.registrosPorSegundo}/s): ` +
      duracao(r.segundosRegistro),
  );
  console.log(
    `  avisos: ${decimal(r.bytesAvisos / 1e6, 1)} MB, ` +
      `${numero(r.bytesAvisos / r.cobrancas)} bytes por aviso`,
  );
  console.log(`  resultado: ${r.passou ? "PASSOU" : "FALHOU"}`);
}
console.log(
  `${cenarios.length - falhas} de ${cenarios.length} cenários dentro da meta.`,
);
process.exitCode = falhas > 0 ? 1 : 0;
