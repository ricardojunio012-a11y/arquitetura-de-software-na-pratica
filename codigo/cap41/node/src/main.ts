// Roda uma versão do laboratório e grava a saída em <dados>/saida/<versão>.
import { mkdirSync, writeFileSync } from "node:fs";
import { Saida } from "./comum.ts";
import { inventario } from "./versoes/inventario.ts";
import { traducao } from "./versoes/traducao.ts";
import { migracao } from "./versoes/migracao.ts";
import { paralelo } from "./versoes/paralelo.ts";
import { desligamento } from "./versoes/desligamento.ts";

const versoes: Record<string, (s: Saida) => Promise<void>> = {
  inventario,
  traducao,
  migracao,
  paralelo,
  desligamento,
};

const [dados, versao] = process.argv.slice(2);
const rodar = versoes[versao];
if (!rodar) throw new Error(`versão desconhecida: ${versao}`);
const saida = new Saida();
await rodar(saida);
mkdirSync(`${dados}/saida/${versao}`, { recursive: true });
writeFileSync(`${dados}/saida/${versao}/resultado.txt`, saida.linhas.join("\n") + "\n");
