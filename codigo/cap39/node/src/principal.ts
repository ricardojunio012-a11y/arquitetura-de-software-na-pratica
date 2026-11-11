// Uso: node src/principal.ts historico|pontos-quentes|acoplamento|caso <pasta de saída>
//      node src/principal.ts analisar <repositório>
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { opcoes, juros, type Premissas } from "./caso.ts";
import { arquivosAtuais, lerLog, type Mudanca } from "./git.ts";
import { criarRepositorio } from "./historico.ts";
import {
  acoplamento,
  filtrar,
  importa,
  MAXIMO_DE_ARQUIVOS,
  pontosQuentes,
} from "./metricas.ts";

const num = (x: number, casas = 0) =>
  x.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
const reais = (x: number) => `R$ ${num(Math.round(x / 100) * 100)}`;
const pct = (x: number) => `${num(100 * x)}%`;
const curto = (caminho: string) => caminho.replace(/^src\//, "");

function relatorioPontosQuentes(todas: Mudanca[], atuais: Map<string, string>) {
  const mudancas = filtrar(todas);
  const l = [
    `${todas.length} commits; ${todas.length - mudancas.length} ignorados ` +
      `por tocarem mais de ${MAXIMO_DE_ARQUIVOS} arquivos`,
    "",
    " # arquivo                    revisões linhas complexidade prioridade " +
      "autor principal",
  ];
  pontosQuentes(mudancas, atuais).forEach((p, i) => {
    const autor = `${p.autorPrincipal.split(" ")[0]} ${pct(p.parteDoAutor)}`;
    l.push(
      `${String(i + 1).padStart(2)} ${curto(p.arquivo).padEnd(26)} ` +
        `${String(p.revisoes).padStart(8)} ${num(p.linhas).padStart(6)} ` +
        `${num(p.complexidade).padStart(12)} ` +
        `${String(p.prioridade).padStart(10)} ${autor}`,
    );
  });
  return l;
}

function relatorioAcoplamento(todas: Mudanca[], atuais: Map<string, string>) {
  const l = [
    "Pares que mudaram juntos em pelo menos 5 commits e em 30% das vezes",
    "",
    "arquivo A                  arquivo B                  " +
      "juntos  grau  módulos   import?",
  ];
  for (const p of acoplamento(filtrar(todas))) {
    const modulo = (c: string) => c.split("/")[1];
    const mesmo = modulo(p.a) === modulo(p.b) ? "mesmo" : "outro";
    const visivel =
      importa(atuais.get(p.a) ?? "", p.b) || importa(atuais.get(p.b) ?? "", p.a);
    l.push(
      `${curto(p.a).padEnd(26)} ${curto(p.b).padEnd(26)} ` +
        `${String(p.juntos).padStart(6)} ` +
        `${pct(p.grau).padStart(5)}  ${mesmo.padEnd(8)}  ${visivel ? "sim" : "NÃO"}`,
    );
  }
  return l;
}

function relatorioCaso(todas: Mudanca[], atuais: Map<string, string>) {
  const premissas: Premissas = JSON.parse(readFileSync("premissas.json", "utf8"));
  const alvo = pontosQuentes(filtrar(todas), atuais)[0].arquivo;
  const recentes = filtrar(todas).filter(
    (m) => m.data >= "2026-01-01" && m.data <= "2026-06-30",
  );
  const j = juros(recentes, alvo, 2, premissas.valorHora);
  const antes = filtrar(todas).filter((m) => m.data <= "2025-06-30");
  const j2025 = juros(antes, alvo, 2, premissas.valorHora);
  const ops = opcoes(j, premissas);
  const col = (rotulo: string, valor: string) =>
    `  ${rotulo.padEnd(46)}${valor.padStart(14)}`;
  const l = [
    `Ponto quente: ${alvo}`,
    `Período: ${recentes.length} commits de 1º jan. a 30 jun. 2026 (dois trimestres)`,
    "",
    "Juros",
    col("mudanças que tocaram o arquivo", num(j.mudancasNoArquivo)),
    col("horas por mudança no arquivo", `${num(j.horasNoArquivo, 1)} h`),
    col("  um ano antes (jan. a jun. 2025)", `${num(j2025.horasNoArquivo, 1)} h`),
    col("horas por mudança no resto do código", `${num(j.horasNoResto, 1)} h`),
    col("correções entre as mudanças do arquivo", pct(j.correcoesNoArquivo)),
    col("correções entre as mudanças do resto", pct(j.correcoesNoResto)),
    col("horas a mais por trimestre", `${num(j.horasAMaisPorTrimestre)} h`),
    col(
      `juros por trimestre (R$ ${premissas.valorHora} por hora)`,
      reais(j.jurosPorTrimestre),
    ),
    "",
    `Opções (novidade: ${premissas.novidade.nome})`,
    "               semanas  pagamento  juros/ano     atraso   12 meses   24 meses",
  ];
  const r = (x: number) => reais(x).padStart(10);
  for (const o of ops) {
    l.push(
      `  ${o.nome.padEnd(12)}${num(o.semanasAteANovidade, 1).padStart(8)} ` +
        `${r(o.custoDoPagamento)} ${r(o.jurosPorAno)} ${r(o.atrasoDaNovidade)} ` +
        `${r(o.total12)} ${r(o.total24)}`,
    );
  }
  return l;
}

function relatorioHistorico(
  pasta: string,
  todas: Mudanca[],
  atuais: Map<string, string>,
) {
  const autores = new Set(todas.map((m) => m.autor));
  const ultimos = execFileSync("git", ["log", "-4", "--format=%as  %<(15)%an %s"], {
    cwd: pasta,
    encoding: "utf8",
  });
  return [
    `Repositório: ${pasta}`,
    `commits: ${todas.length}, de ${todas[0].data} a ${todas[todas.length - 1].data}`,
    `autores: ${autores.size}; arquivos: ${atuais.size}`,
    "",
    "Os quatro commits mais recentes:",
    ...ultimos.trimEnd().split("\n"),
  ];
}

const [versao, destino] = process.argv.slice(2);
if (versao === "analisar") {
  const todas = lerLog(destino);
  const atuais = arquivosAtuais(destino);
  console.log(
    [
      ...relatorioPontosQuentes(todas, atuais),
      "",
      ...relatorioAcoplamento(todas, atuais),
    ].join("\n"),
  );
} else {
  const pasta = join(tmpdir(), "morada");
  criarRepositorio(pasta);
  const todas = lerLog(pasta);
  const atuais = arquivosAtuais(pasta);
  const linhas = {
    historico: () => relatorioHistorico(pasta, todas, atuais),
    "pontos-quentes": () => relatorioPontosQuentes(todas, atuais),
    acoplamento: () => relatorioAcoplamento(todas, atuais),
    caso: () => relatorioCaso(todas, atuais),
  }[versao];
  if (!linhas) throw new Error(`versão desconhecida: ${versao}`);
  const texto = linhas().join("\n") + "\n";
  mkdirSync(join(destino, versao), { recursive: true });
  writeFileSync(join(destino, versao, "resultado.txt"), texto);
  process.stdout.write(texto);
}
