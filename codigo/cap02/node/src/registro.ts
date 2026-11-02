// Uso: node registro.ts <registro.json>
// Simula a fila de registro em lote e compara o tempo até a confirmação com a meta.
import fs from "node:fs";
import {
  disponiveisAte,
  percentil,
  simular,
  type Premissas,
} from "./fila-de-registro.ts";

const numero = (n: number) => n.toLocaleString("pt-BR");
const porCento = (n: number) => `${n.toFixed(2).replace(".", ",")}%`;

// 10 min | 1 h 36 min | nunca
function duracao(segundos: number | null): string {
  if (segundos === null) return "nunca";
  const minutos = Math.round(segundos / 60);
  const h = Math.floor(minutos / 60);
  if (h === 0) return `${minutos} min`;
  return minutos % 60 === 0 ? `${h} h` : `${h} h ${minutos % 60} min`;
}

const p: Premissas = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
console.log(`${p.id}: ${p.descricao} (semente ${p.semente})`);
console.log(
  `  premissas: ${numero(p.boletos)} boletos em arquivos de ` +
    `${numero(p.boletosPorArquivo)}, ${numero(p.registrosPorSegundo)} por segundo,`,
);
console.log(
  `  retorno ${duracao(p.retornoSegundos)} depois de cada arquivo, ` +
    `${p.falhaPassageiraPorCento}% de recusa passageira, ` +
    `1 em ${p.recusaDefinitivaACada} definitiva`,
);
console.log(
  `  estimativa por divisão: ` +
    `${duracao(p.boletos / p.registrosPorSegundo)}  ` +
    `meta: todos em até ${duracao(p.limiteSegundos)}`,
);
let falhas = 0;
for (const ajustada of [false, true]) {
  const r = simular(p, ajustada);
  const dentro = disponiveisAte(r, p.limiteSegundos);
  const passou = dentro === p.boletos;
  if (!passou) falhas++;
  const pct = (m: number) => duracao(percentil(r, p.boletos, m));
  const ultima = Math.max(...r.disponivelEm.keys());
  console.log(ajustada ? "ajustada:" : "ingênua:");
  console.log(
    `  arquivos: ${r.arquivos}  tentativas de registro: ${numero(r.tentativas)}`,
  );
  console.log(
    `  disponível em p50: ${pct(500)}  p95: ${pct(950)}  ` +
      `p99: ${pct(990)}  p99,9: ${pct(999)}`,
  );
  console.log(
    `  última disponível: ${duracao(ultima)}  sem registro: ` +
      `${numero(r.semRegistro)}  com Pix: ${numero(r.viaPix)}`,
  );
  console.log(
    `  em até ${duracao(p.limiteSegundos)}: ${numero(dentro)} ` +
      `(${porCento((100 * dentro) / p.boletos)})`,
  );
  console.log(`  resultado: ${passou ? "PASSOU" : "FALHOU"}`);
}
process.exitCode = falhas > 0 ? 1 : 0;
