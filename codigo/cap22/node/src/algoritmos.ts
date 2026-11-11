// A versão "algoritmos": a mesma sequência de pedidos distribuída entre três
// servidores por quatro algoritmos. Os pedidos têm duração variada (a maioria curta,
// alguns longos), e o terceiro servidor é duas vezes mais lento, de uma geração mais
// antiga de máquinas. O tempo é simulado.
import fs from "node:fs";
import path from "node:path";
import {
  type Algoritmo,
  duasEscolhas,
  hashDaChave,
  menosConexoes,
  rodizio,
  type Servidor,
  sorteador,
} from "./balanceamento.ts";

const PEDIDOS = 20_000;
const INTERVALO_MS = 5; // 200 pedidos por segundo
const LENTIDAO = [1, 1, 2];

// A mesma carga para todos: duração base e condomínio de cada pedido
const sorteio = sorteador(42);
const carga = Array.from({ length: PEDIDOS }, () => ({
  duracao: sorteio() < 0.9 ? 5 + sorteio() * 5 : 40 + sorteio() * 40,
  // Poucos condomínios grandes concentram muitos pedidos
  condominio: sorteio() < 0.3 ? 7 : Math.floor(sorteio() * 500),
}));

function simular(algoritmo: Algoritmo) {
  const servidores: Servidor[] = LENTIDAO.map(() => ({ emAndamento: 0 }));
  const terminos: number[][] = LENTIDAO.map(() => []);
  const tempos: number[] = [];
  const sorteioDoAlgoritmo = sorteador(7);
  carga.forEach((p, i) => {
    const agora = i * INTERVALO_MS;
    // Libera os pedidos que já terminaram
    terminos.forEach((lista, s) => {
      const restantes = lista.filter((t) => t > agora);
      servidores[s].emAndamento = restantes.length;
      terminos[s] = restantes;
    });
    const s = algoritmo(servidores, p.condominio, sorteioDoAlgoritmo);
    // Cada servidor divide a sua capacidade entre os pedidos em andamento
    const duracao = p.duracao * LENTIDAO[s] * (1 + servidores[s].emAndamento * 0.5);
    terminos[s].push(agora + duracao);
    tempos.push(duracao);
  });
  tempos.sort((a, b) => a - b);
  const pct = (q: number) => tempos[Math.floor(q * (tempos.length - 1))].toFixed(0);
  return `mediana ${pct(0.5)} ms, p99 ${pct(0.99)} ms`;
}

const linhas = [
  `${PEDIDOS} pedidos, 3 servidores (o terceiro duas vezes mais lento)`,
  `rodízio (round robin):      ${simular(rodizio)}`,
  `menos conexões:             ${simular(menosConexoes)}`,
  `duas escolhas aleatórias:   ${simular(duasEscolhas)}`,
  `hash do condomínio:         ${simular(hashDaChave)}`,
];
const saida = path.join(process.argv[2], "saida", "algoritmos");
fs.mkdirSync(saida, { recursive: true });
fs.writeFileSync(path.join(saida, "resultado.txt"), linhas.join("\n") + "\n");
console.log(linhas.join("\n"));
