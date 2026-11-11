// A versão "webhook": as mesmas entregas passam pelo receptor ingênuo e pelo robusto.
import fs from "node:fs";
import path from "node:path";
import { entregar, type Envio } from "./gateway.ts";
import { Caixa, ReceptorIngenuo, ReceptorRobusto } from "./receptores.ts";

const dados = process.argv[2];
const cenario = JSON.parse(
  fs.readFileSync(path.join(dados, "entrada", "webhook.json"), "utf8"),
);
const entregas = (cenario.entregas as Envio[]).map((envio) => ({
  envio,
  entrega: entregar(cenario.segredo, cenario.agora, envio),
}));

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

function rodar(titulo: string, receptor: ReceptorIngenuo | ReceptorRobusto) {
  const linhas = [`== ${titulo}`];
  for (const { envio, entrega } of entregas) {
    const r = receptor.receber(entrega);
    linhas.push(`${envio.id}: ${r.status} ${r.motivo}`);
  }
  const { cobrancas, pagamentos } = receptor.caixa;
  const situacoes = [...cobrancas.values()].map((c) => `${c.cobranca} ${c.situacao}`);
  const total = pagamentos.reduce((soma, p) => soma + p.valorCentavos, 0);
  linhas.push(
    `cobranças: ${situacoes.join(" | ")}`,
    `pagamentos registrados: ${pagamentos.length}, R$ ${reais(total)}`,
    "",
  );
  return linhas;
}

const resultado = [
  ...rodar("receptor ingênuo", new ReceptorIngenuo(new Caixa(cenario.cobrancas))),
  ...rodar(
    "receptor robusto",
    new ReceptorRobusto(
      new Caixa(cenario.cobrancas),
      cenario.segredo,
      () => cenario.agora,
    ),
  ),
];

const saida = path.join(dados, "saida", "webhook");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), resultado.join("\n"));
console.log(`webhook: ${entregas.length} entregas para cada receptor`);
