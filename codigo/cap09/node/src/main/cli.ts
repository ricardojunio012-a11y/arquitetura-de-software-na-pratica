// Uso: node cli.ts <comando> [argumentos]   (repositório no PostgreSQL)
//      node cli.ts preparar-banco            (apaga e recria a tabela)
// Cada execução é um processo novo: o estado fica no banco, entre uma e outra.
import { executar } from "../adaptadores/entrada/cli.ts";
import { montar } from "./montar.ts";

const args = process.argv.slice(2);
const preparar = args[0] === "preparar-banco";
const { servico, fechar } = await montar("postgres", preparar);
const [texto, codigo] = preparar
  ? ["banco preparado", 0]
  : await executar(servico, args);
await fechar();
console.log(texto);
process.exitCode = codigo;
