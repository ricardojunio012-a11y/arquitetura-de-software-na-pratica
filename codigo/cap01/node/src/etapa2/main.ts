// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
import { gerarCobrancaMensal } from "./cobranca.ts";

const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
gerarCobrancaMensal(entrada, saida, hoje);
console.log("cobranças geradas em " + saida);
