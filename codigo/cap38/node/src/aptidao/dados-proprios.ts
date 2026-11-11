// Função de aptidão do ADR-010: nenhum módulo lê nem grava a tabela de outro.
// Atômica e estática: lê o código-fonte, inclusive o SQL escrito em strings, que o
// teste de dependências do capítulo 10 não enxerga.
import fs from "node:fs";
import path from "node:path";

// Cada tabela tem um dono, e o esquema do banco tem o nome do módulo dono
export const DONOS: Record<string, string[]> = {
  cadastro: ["unidades", "moradores"],
  financeiro: ["cobrancas", "acordos"],
  reservas: ["reservas", "espacos"],
};

const SQL = /\b(from|join|into|update)\s+([a-z_]+)(\.[a-z_]+)?/gi;

function arquivos(pasta: string): string[] {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(pasta, e.name);
    return e.isDirectory()
      ? arquivos(caminho)
      : caminho.endsWith(".ts")
        ? [caminho]
        : [];
  });
}

export function dadosProprios(pasta: string): string[] {
  const violacoes: string[] = [];
  for (const arquivo of arquivos(pasta).sort()) {
    const relativo = path.relative(pasta, arquivo).split(path.sep).join("/");
    const modulo = relativo.split("/")[0];
    const linhas = fs.readFileSync(arquivo, "utf8").split("\n");
    linhas.forEach((linha, i) => {
      for (const [, verbo, esquema, tabela] of linha.matchAll(SQL)) {
        const onde = `${relativo}:${i + 1}`;
        const acao = /from|join/i.test(verbo) ? "lê" : "grava";
        if (!tabela) violacoes.push(`${onde} ${acao} ${esquema} sem dizer o esquema`);
        else if (!DONOS[esquema]?.includes(tabela.slice(1)))
          violacoes.push(`${onde} ${acao} ${esquema}${tabela}, tabela sem dono`);
        else if (esquema !== modulo)
          violacoes.push(`${onde} ${acao} ${esquema}${tabela}, de ${esquema}`);
      }
    });
  }
  return violacoes;
}
