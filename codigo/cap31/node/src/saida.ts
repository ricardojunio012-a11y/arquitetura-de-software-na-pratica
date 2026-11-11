// Grava o resultado de uma versão em saida/<versão>/resultado.txt e o mostra.
import fs from "node:fs";
import path from "node:path";

export function gravar(versao: string, linhas: string[]) {
  const pasta = path.join(process.argv[2] ?? "/dados", "saida", versao);
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, "resultado.txt"), linhas.join("\n") + "\n");
  console.log(linhas.join("\n"));
}
