// A versão "cfo": a tabela que vai para a diretoria financeira, com receita,
// custo dos produtos vendidos (CPV), margem bruta e custo por unidade, hoje e
// com 10 vezes mais condomínios, nas três arquiteturas.
import { v } from "./entradas.ts";
import { gravar, numero, pct, reais } from "./formato.ts";
import { ARQUITETURAS, type Linha, custoMensal, somar } from "./modelo.ts";

const hoje = v("condominios");
const cenarios = ARQUITETURAS.flatMap(([arq]) =>
  [hoje, 10 * hoje].map((n) => ({ arq, n, linhas: custoMensal(arq, n) })),
);
const atendimento = (ls: Linha[]) =>
  ls.filter((l) => l.etiqueta === "atendimento").reduce((s, l) => s + l.valor, 0);

const largura = 11;
const celula = (s: string) => s.padStart(largura);
const linha = (rotulo: string, f: (c: (typeof cenarios)[number]) => string) =>
  rotulo.padEnd(22) + cenarios.map((c) => celula(f(c))).join("");

const receita = (n: number) => n * v("mensalidade");
const cpv = (ls: Linha[]) => somar(ls);
const margem = (c: (typeof cenarios)[number]) => receita(c.n) - cpv(c.linhas);

const saida = [
  "TABELA PARA O CFO: um mês, em reais",
  linha("", (c) => c.arq),
  linha("condomínios", (c) => numero(c.n)),
  linha("receita", (c) => numero(receita(c.n))),
  linha("CPV: infraestrutura", (c) => numero(somar(c.linhas, "infra"))),
  linha("CPV: operação", (c) =>
    numero(somar(c.linhas, "pessoas") - atendimento(c.linhas)),
  ),
  linha("CPV: atendimento", (c) => numero(atendimento(c.linhas))),
  linha("CPV total", (c) => numero(cpv(c.linhas))),
  linha("margem bruta", (c) => numero(margem(c))),
  linha("margem bruta (%)", (c) => pct(margem(c) / receita(c.n))),
  linha("infra / receita", (c) => pct(somar(c.linhas, "infra") / receita(c.n))),
  linha("CPV por condomínio", (c) => numero(cpv(c.linhas) / c.n, 2)),
  linha("CPV por boleto", (c) => numero(cpv(c.linhas) / (c.n * v("boletos")), 3)),
  "",
  "Fora do CPV (despesas operacionais): esteira " +
    reais(v("esteira")) +
    " e SOC 2 " +
    reais(v("soc2")) +
    " por mês.",
];

// Quanto a mais o cliente do silo precisa pagar para o silo não baixar a margem
for (const n of [hoje, 10 * hoje]) {
  const extra = cpv(custoMensal("silos", n)) - cpv(custoMensal("pool", n));
  const isolados = Math.round(n * v("isolados"));
  saida.push(
    `Silos com ${numero(n)} condomínios: ${reais(extra)} a mais que o pool, ` +
      `${reais(extra / isolados, 2)} por isolado.`,
  );
}

gravar("cfo", saida);
