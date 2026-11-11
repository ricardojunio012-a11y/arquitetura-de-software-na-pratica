// A versão "compromisso": quanto comprometer num plano de economia para os nós
// de aplicação, dado o uso de cada hora de um mês, e a reserva do banco.
import { v } from "./entradas.ts";
import { gravar, numero, pct, reais } from "./formato.ts";

// Uso de um mês de 30 dias, hora a hora (premissa do laboratório): 2 nós sempre,
// 3 em horário comercial nos dias úteis, 6 das 6h às 22h nos dias 1 e 5
const FIM_DE_SEMANA = [6, 7, 13, 14, 20, 21, 27, 28];
export function perfil(): number[] {
  const horas: number[] = [];
  for (let dia = 1; dia <= 30; dia++) {
    for (let h = 0; h < 24; h++) {
      let nos = 2;
      if (!FIM_DE_SEMANA.includes(dia) && h >= 8 && h < 20) nos = 3;
      if ((dia === 1 || dia === 5) && h >= 6 && h < 22) nos = 6;
      horas.push(nos);
    }
  }
  return horas;
}

// Custo em dólares: o compromisso é pago em toda hora, usado ou não; o que
// passa dele é cobrado sob demanda
export function custoComCompromisso(horas: number[], nos: number, preco: number) {
  const fixo = nos * preco * horas.length;
  const excedente = horas.reduce((s, n) => s + Math.max(0, n - nos), 0);
  return fixo + excedente * v("no");
}

const horas = perfil();
const nosHora = horas.reduce((s, n) => s + n, 0);
const emReais = (dolares: number) => dolares * v("dolar");
const sobDemanda = nosHora * v("no");
const saida = [
  "COMPROMISSO DE USO: nós de aplicação, um mês de 30 dias",
  `  ${numero(nosHora)} nós-hora; mínimo ${Math.min(...horas)}, ` +
    `máximo ${Math.max(...horas)}`,
  `  ${"compromisso".padEnd(14)}${"1 ano".padStart(10)}${"economia".padStart(10)}` +
    `${"3 anos".padStart(10)}${"economia".padStart(10)}`,
];
for (let nos = 0; nos <= 6; nos++) {
  const [c1, c3] = [v("plano1"), v("plano3")].map((p) =>
    custoComCompromisso(horas, nos, p),
  );
  const rotulo = nos === 1 ? "1 nó" : `${nos} nós`;
  saida.push(
    `  ${rotulo.padEnd(14)}${reais(emReais(c1)).padStart(10)}` +
      `${pct(1 - c1 / sobDemanda).padStart(10)}` +
      `${reais(emReais(c3)).padStart(10)}${pct(1 - c3 / sobDemanda).padStart(10)}`,
  );
}

// O banco fica ligado o mês inteiro: a reserva cobre 100% das horas
const banco = (preco: number) => emReais(preco * horas.length);
saida.push(
  "",
  "BANCO db.m7g.large Multi-AZ, ligado o mês inteiro",
  `  sob demanda           ${reais(banco(v("banco"))).padStart(9)}`,
  `  reservado por 1 ano   ${reais(banco(v("reserva1"))).padStart(9)}` +
    `  economia de ${pct(1 - v("reserva1") / v("banco"))}`,
);

gravar("compromisso", saida);
