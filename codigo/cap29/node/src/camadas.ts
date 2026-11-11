// A versão "camadas": 100 pagamentos atravessam três camadas (aplicativo, API do
// Morada, serviço de cobrança) até um gateway fora do ar. Quando cada camada faz as
// suas próprias 3 tentativas, as chamadas se multiplicam.
import fs from "node:fs";
import path from "node:path";
import { type Chamada, comNovasTentativas, Orcamento } from "./protecoes.ts";
import { gerador, Relogio } from "./relogio.ts";

const dados = process.argv[2];

async function cenario(tentativasPorCamada: number[], comOrcamento: boolean) {
  const relogio = new Relogio();
  const sortear = gerador(3);
  let chamadas = 0;
  const gateway = async () => {
    chamadas++;
    await relogio.dormir(20);
    throw new Error("503");
  };
  // Cada camada tem o seu orçamento, como cada processo teria o seu
  const orcamentos = tentativasPorCamada.map(() => new Orcamento(0.1, 10));
  // A camada mais interna chama o gateway; cada uma envolve a de dentro
  let chamada: Chamada<never> = gateway;
  tentativasPorCamada.forEach((tentativas, i) => {
    const interna = chamada;
    chamada = () =>
      comNovasTentativas(relogio, interna, {
        tentativas,
        baseMs: 100,
        sortear,
        orcamento: comOrcamento ? orcamentos[i] : undefined,
      });
  });
  const pedidos = Array.from({ length: 100 }, async (_, k) => {
    await relogio.dormir(k * 50);
    await chamada().catch(() => {});
  });
  await relogio.rodar();
  await Promise.all(pedidos);
  return chamadas;
}

const casos: [string, number[], boolean][] = [
  ["3 tentativas em cada camada", [3, 3, 3], false],
  ["3 tentativas só na camada de cobrança", [3, 1, 1], false],
  ["3 em cada camada, com orçamento de 10%", [3, 3, 3], true],
];
const linhas = [
  "100 pagamentos, gateway fora do ar, três camadas entre o morador e o gateway",
];
for (const [nome, tentativas, comOrcamento] of casos) {
  const n = await cenario(tentativas, comOrcamento);
  linhas.push(`  ${nome.padEnd(40)}${String(n).padStart(5)} chamadas`);
}

const saida = path.join(dados, "saida", "camadas");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
