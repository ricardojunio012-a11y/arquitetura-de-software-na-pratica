// Gera o histórico git simulado do Morada: 18 meses (jan. 2025 a jun. 2026),
// com autores e datas fixos.
// O histórico tem um módulo quente e complexo (a cobrança) e um acoplamento de
// mudança escondido: a regra de reservas lê uma tabela do Financeiro sem importar
// nada dele, e as duas mudam juntas. Tudo vem de um gerador com semente fixa.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

export function sorteador(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PESSOAS = [
  ["Ana Lima", "ana"],
  ["Bruno Reis", "bruno"],
  ["Carla Dias", "carla"],
  ["Diego Melo", "diego"],
  ["Elisa Prado", "elisa"],
  ["Fábio Costa", "fabio"],
  ["Gabriela Nunes", "gabi"],
  ["Hugo Alves", "hugo"],
];

// Peso de cada área: a chance de um commit mexer nela.
const AREAS: [string, number][] = [
  ["src/financeiro/cobranca.ts", 22],
  ["src/reservas/regras.ts", 8],
  ["src/financeiro/situacao.ts", 2],
  ["src/financeiro/boleto.ts", 6],
  ["src/financeiro/pix.ts", 7],
  ["src/reservas/agenda.ts", 7],
  ["src/portaria/visitantes.ts", 8],
  ["src/portaria/encomendas.ts", 5],
  ["src/comunicacao/avisos.ts", 8],
  ["src/comunicacao/notificador.ts", 5],
  ["src/cadastro/unidades.ts", 6],
  ["src/cadastro/moradores.ts", 6],
  ["src/manutencao/chamados.ts", 7],
  ["src/legado/relatorio-anual.ts", 1],
];

const COBRANCA = "src/financeiro/cobranca.ts";
const REGRAS = "src/reservas/regras.ts";
const SITUACAO = "src/financeiro/situacao.ts";
const LEGADO = "src/legado/relatorio-anual.ts";

type Commit = {
  quando: number; // segundos desde 1970, UTC
  autor: number;
  tipo: "feat" | "fix" | "refactor" | "style" | "chore";
  assunto: string;
  horas: number;
  mudancas: Map<string, string>; // caminho -> conteúdo novo
};

class Arquivo {
  caminho: string;
  linhas: string[];
  regras = 0;
  constructor(caminho: string, cabecalho: string[]) {
    this.caminho = caminho;
    this.linhas = [`// Morada: ${caminho}`, ...cabecalho, ""];
  }
  texto(): string {
    return this.linhas.join("\n") + "\n";
  }
  // Uma regra nova: uma função com ifs aninhados até a profundidade pedida.
  acrescentar(profundidade: number) {
    const n = ++this.regras;
    const l = [`export function regra${n}(c: Caso): number {`];
    l.push(`  const limite${n} = ${(n * 7) % 31};`);
    for (let p = 1; p <= profundidade; p++) {
      l.push(`${"  ".repeat(p)}if (c.campo${p} > limite${n}) {`);
    }
    l.push(`${"  ".repeat(profundidade + 1)}return c.valor * ${1 + n / 100};`);
    for (let p = profundidade; p >= 1; p--) l.push(`${"  ".repeat(p)}}`);
    l.push("  return c.valor;", "}", "");
    this.linhas.push(...l);
  }
  // Uma correção: muda o valor de um limite que já existe.
  corrigir(sorteio: () => number) {
    const alvos = this.linhas
      .map((t, i) => (/const limite\d+ = \d+;/.test(t) ? i : -1))
      .filter((i) => i >= 0);
    if (alvos.length === 0) return this.acrescentar(1);
    const i = alvos[Math.floor(sorteio() * alvos.length)];
    const valor = Math.floor(sorteio() * 90) + 1;
    this.linhas[i] = this.linhas[i].replace(/= \d+;/, `= ${valor};`);
  }
}

function escolher<T>(itens: [T, number][], sorteio: () => number): T {
  const total = itens.reduce((s, [, p]) => s + p, 0);
  let r = sorteio() * total;
  for (const [item, peso] of itens) {
    r -= peso;
    if (r < 0) return item;
  }
  return itens[itens.length - 1][0];
}

function modulo(caminho: string) {
  return caminho.split("/")[1];
}

export function planejar(semente = 39): Commit[] {
  const sorteio = sorteador(semente);
  const arquivos = new Map<string, Arquivo>();
  for (const [caminho] of AREAS) {
    const cab = ['import type { Caso } from "../tipos.ts";'];
    if (caminho === COBRANCA) cab.push('import { emitirBoleto } from "./boleto.ts";');
    if (caminho === REGRAS) {
      // O acoplamento escondido: lê a tabela do Financeiro, sem importar o módulo.
      cab.push(
        'const EM_DEBITO = "SELECT em_debito FROM financeiro.situacao_unidade";',
      );
    }
    arquivos.set(caminho, new Arquivo(caminho, cab));
  }
  for (const a of arquivos.values()) {
    const iniciais = a.caminho === LEGADO ? 40 : a.caminho === COBRANCA ? 6 : 3;
    for (let k = 0; k < iniciais; k++) a.acrescentar(a.caminho === LEGADO ? 5 : 2);
  }
  const commits: Commit[] = [];
  const inicio = Date.UTC(2025, 0, 6, 12) / 1000; // segunda-feira, 6 jan. 2025
  const todos = () => new Map([...arquivos].map(([c, a]) => [c, a.texto()]));
  commits.push({
    quando: inicio,
    autor: 0,
    tipo: "chore",
    assunto: "chore: importa o código do repositório antigo",
    horas: 2,
    mudancas: todos(),
  });

  let pendente: string | null = null; // correção de um acoplamento esquecido
  for (let semana = 0; semana < 77; semana++) {
    if (semana === 36) {
      for (const a of arquivos.values()) a.linhas[0] += " (formatado)";
      commits.push({
        quando: inicio + semana * 604800 + 86400,
        autor: 7,
        tipo: "style",
        assunto: "style: aplica o formatador em todo o código",
        horas: 1,
        mudancas: todos(),
      });
    }
    const quantos = 3 + Math.floor(sorteio() * 5);
    const momentos = Array.from({ length: quantos }, () => {
      const dia = Math.floor(sorteio() * 5);
      const hora = 9 + Math.floor(sorteio() * 9);
      const minuto = Math.floor(sorteio() * 60);
      // horário de Brasília (UTC-3)
      return inicio + semana * 604800 + dia * 86400 + (hora - 9) * 3600 + minuto * 60;
    }).sort((x, y) => x - y);
    for (const quando of momentos) {
      let area = escolher(AREAS, sorteio);
      let tipo: Commit["tipo"];
      const tocados = new Set<string>();
      const esquecida = pendente !== null;
      if (pendente) {
        area = pendente;
        pendente = null;
        tipo = "fix";
        tocados.add(SITUACAO).add(REGRAS);
      } else {
        const chanceDeCorrecao = area === COBRANCA ? 0.45 : 0.2;
        const r = sorteio();
        tipo = r < chanceDeCorrecao ? "fix" : r < 0.88 ? "feat" : "refactor";
        tocados.add(area);
        if (area === REGRAS) {
          if (sorteio() < 0.8) tocados.add(SITUACAO);
          else pendente = REGRAS; // esqueceu o outro lado: vem uma correção
        }
        if (area === SITUACAO && sorteio() < 0.5) tocados.add(REGRAS);
        if (area === COBRANCA && sorteio() < 0.3)
          tocados.add("src/financeiro/boleto.ts");
      }
      for (const caminho of tocados) {
        const a = arquivos.get(caminho)!;
        if (tipo === "feat") {
          const prof =
            caminho === COBRANCA ? Math.min(6, 2 + Math.floor(a.regras / 12)) : 2;
          a.acrescentar(prof);
        } else a.corrigir(sorteio);
      }
      const cob = arquivos.get(COBRANCA)!;
      const fator = tocados.has(COBRANCA)
        ? 1 + cob.linhas.length / 250
        : tocados.has(REGRAS)
          ? 1.5
          : 1;
      const base = { feat: 6, fix: 3, refactor: 4, style: 1, chore: 1 }[tipo];
      const horas = Math.max(1, Math.round(base * fator * (0.7 + 0.6 * sorteio())));
      const autor =
        area === COBRANCA
          ? escolher<number>(
              [
                [0, 60],
                [1, 25],
                [2, 5],
                [3, 5],
                [4, 5],
              ],
              sorteio,
            )
          : Math.floor(sorteio() * PESSOAS.length);
      const assunto = esquecida
        ? "fix(reservas): unidade em débito conseguia reservar"
        : `${tipo}(${modulo(area)}): ${tipo === "feat" ? "regra nova" : "ajuste"} ` +
          `em ${area.split("/")[2]}`;
      commits.push({
        quando,
        autor,
        tipo,
        assunto,
        horas,
        mudancas: new Map([...tocados].map((c) => [c, arquivos.get(c)!.texto()])),
      });
    }
  }
  return commits;
}

// Monta o fluxo do git fast-import: um commit atrás do outro, com o conteúdo inteiro.
function fluxo(commits: Commit[]): Buffer {
  const partes: string[] = [];
  const dados = (s: string) => `data ${Buffer.byteLength(s)}\n${s}\n`;
  commits.forEach((c, i) => {
    const [nome, usuario] = PESSOAS[c.autor];
    const quem = `${nome} <${usuario}@morada.example> ${c.quando} -0300`;
    const mensagem = `${c.assunto}\n\nHoras: ${c.horas}\n`;
    partes.push(`commit refs/heads/main\nmark :${i + 1}\n`);
    partes.push(`author ${quem}\ncommitter ${quem}\n${dados(mensagem)}`);
    if (i > 0) partes.push(`from :${i}\n`);
    for (const [caminho, texto] of c.mudancas) {
      partes.push(`M 100644 inline ${caminho}\n${dados(texto)}`);
    }
  });
  return Buffer.from(partes.join(""));
}

export function criarRepositorio(pasta: string, semente = 39): number {
  rmSync(pasta, { recursive: true, force: true });
  mkdirSync(pasta, { recursive: true });
  const git = (...args: string[]) => execFileSync("git", args, { cwd: pasta });
  git("init", "-q", "-b", "main");
  const commits = planejar(semente);
  execFileSync("git", ["fast-import", "--quiet"], {
    cwd: pasta,
    input: fluxo(commits),
  });
  git("checkout", "-q", "-f", "main");
  return commits.length;
}
