// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
// Monta os módulos; a ordem dos relatórios não importa mais.
import fs from "node:fs";
import path from "node:path";
import { calcularCobrancas, relatorioDeCobrancas } from "./cobranca/index.ts";
import { relatorioDeInadimplencia } from "./inadimplencia/index.ts";
import { prestacaoDeContas } from "./prestacao/index.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const nome = dados.condominio.nome;
const cobrancas = calcularCobrancas(
  dados.condominio.despesasDoMesCentavos,
  dados.unidades,
  hoje,
);

const relatorios = {
  inadimplencia: relatorioDeInadimplencia(nome, hoje, cobrancas),
  cobrancas: relatorioDeCobrancas(nome, hoje, cobrancas),
  prestacao: prestacaoDeContas(
    nome,
    hoje,
    cobrancas,
    dados.despesas,
    dados.fundoDeReservaSaldoAnteriorCentavos,
  ),
};
fs.mkdirSync(saida, { recursive: true });
for (const [tipo, texto] of Object.entries(relatorios)) {
  fs.writeFileSync(path.join(saida, `${tipo}.txt`), texto);
}
console.log("relatórios gerados em " + saida);
