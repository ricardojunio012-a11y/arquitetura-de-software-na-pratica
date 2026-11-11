// O registro de decisões: lê os ADRs em Markdown e confere o formato, a numeração
// e os vínculos de substituição. Os problemas saem como texto, um por linha.
import fs from "node:fs";
import path from "node:path";

export type Adr = {
  arquivo: string;
  numero: number; // o número do título
  titulo: string;
  situacao: string;
  data: string;
  substitui?: number;
  secoes: string[];
};

export const SECOES = [
  "Contexto",
  "Decisão",
  "Alternativas consideradas",
  "Consequências",
  "Quando revisitar",
];
const SITUACOES = /^(proposto|aceito|descontinuado|substituído por ADR-(\d{3}))$/;

const id = (n: number) => `ADR-${String(n).padStart(3, "0")}`;

// Lê um ADR. O que faltar fica vazio, e a validação aponta.
export function lerAdr(arquivo: string, texto: string): Adr {
  const titulo = texto.match(/^# ADR-(\d{3}): (.+)$/m);
  const campo = (nome: string) =>
    texto.match(new RegExp(`^- ${nome}: (.+)$`, "m"))?.[1].trim() ?? "";
  const substitui = campo("Substitui").match(/^ADR-(\d{3})$/);
  return {
    arquivo,
    numero: titulo ? Number(titulo[1]) : NaN,
    titulo: titulo ? titulo[2] : "",
    situacao: campo("Situação"),
    data: campo("Data"),
    substitui: substitui ? Number(substitui[1]) : undefined,
    secoes: [...texto.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()),
  };
}

export function lerRegistro(pasta: string): Adr[] {
  return fs
    .readdirSync(pasta)
    .filter((nome) => nome.endsWith(".md"))
    .sort()
    .map((nome) => lerAdr(nome, fs.readFileSync(path.join(pasta, nome), "utf8")));
}

// Uma função de aptidão declara o ADR que protege
export type Ligacao = { funcao: string; adr: number };

export function validar(adrs: Adr[], ligacoes: Ligacao[] = []): string[] {
  const problemas: string[] = [];
  const porNumero = new Map<number, Adr[]>();
  for (const a of adrs) {
    // Formato: o nome do arquivo e o título dizem o mesmo número
    const doArquivo = a.arquivo.match(/^adr-(\d{3})-[a-z0-9-]+\.md$/);
    if (!doArquivo) problemas.push(`${a.arquivo}: nome fora do padrão adr-NNN-nome.md`);
    else if (Number(doArquivo[1]) !== a.numero)
      problemas.push(`${a.arquivo}: o título diz ${id(a.numero)}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.data))
      problemas.push(`${a.arquivo}: data ausente ou fora do formato AAAA-MM-DD`);
    if (!SITUACOES.test(a.situacao))
      problemas.push(`${a.arquivo}: situação inválida "${a.situacao}"`);
    const faltam = SECOES.filter((s) => !a.secoes.includes(s));
    if (faltam.length) problemas.push(`${a.arquivo}: falta a seção "${faltam[0]}"`);
    else if (a.secoes.join() !== SECOES.join())
      problemas.push(`${a.arquivo}: seções fora de ordem`);
    if (doArquivo) {
      const n = Number(doArquivo[1]);
      porNumero.set(n, [...(porNumero.get(n) ?? []), a]);
    }
  }
  // Numeração: um número, um ADR
  for (const [n, lista] of porNumero)
    if (lista.length > 1)
      problemas.push(
        `${id(n)}: número repetido em ${lista.map((a) => a.arquivo).join(" e ")}`,
      );

  // Substituição: o vínculo vale nos dois sentidos
  const unico = (n: number) => porNumero.get(n)?.[0];
  for (const a of adrs) {
    const n = Number(a.arquivo.match(/^adr-(\d{3})/)?.[1] ?? a.numero);
    if (a.substitui !== undefined) {
      const antigo = unico(a.substitui);
      if (!antigo)
        problemas.push(`${id(n)}: substitui ${id(a.substitui)}, que não existe`);
      else if (antigo.situacao !== `substituído por ${id(n)}`)
        problemas.push(
          `${id(n)}: substitui ${id(a.substitui)}, que continua "${antigo.situacao}"`,
        );
      if (a.substitui > n) problemas.push(`${id(n)}: substitui um ADR mais novo`);
    }
    const por = a.situacao.match(SITUACOES)?.[2];
    if (por && unico(Number(por))?.substitui !== n)
      problemas.push(
        `${id(n)}: diz que foi substituído por ADR-${por}, que não diz isso`,
      );
  }

  // Funções de aptidão: cada uma protege uma decisão em vigor
  for (const l of ligacoes) {
    const adr = unico(l.adr);
    if (!adr) problemas.push(`função ${l.funcao}: ${id(l.adr)} não existe`);
    else if (adr.situacao !== "aceito")
      problemas.push(`função ${l.funcao}: ${id(l.adr)} está "${adr.situacao}"`);
  }
  return problemas;
}

// O índice do registro é gerado, nunca escrito à mão
export function indice(adrs: Adr[]): string {
  const linhas = [
    "# Registro de decisões do Morada",
    "",
    "| ADR | Decisão | Situação | Data |",
    "|---|---|---|---|",
  ];
  for (const a of adrs)
    linhas.push(`| ${id(a.numero)} | ${a.titulo} | ${a.situacao} | ${a.data} |`);
  return linhas.join("\n") + "\n";
}

export { id as nomeDoAdr };
