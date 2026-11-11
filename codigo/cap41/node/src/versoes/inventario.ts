// Passo 1: o proxy entra na frente do legado sem mudar nada e mede o uso de cada
// rota. O inventário diz o que migrar primeiro e o que desligar sem migrar.
import { usarAplicativo, montar } from "../ambiente.ts";
import { Saida } from "../comum.ts";

// O estado que cada rota lê ou grava, levantado no código do legado
const ESTADO: Record<string, string> = {
  "GET aptos": "apto",
  "GET rateios": "rateio",
  "POST baixa": "rateio",
  "GET inadimplentes": "rateio",
  "POST comunicados": "comunicado",
  "GET dimob": "rateio (relatório anual)",
};

export async function inventario(saida: Saida): Promise<void> {
  const amb = await montar();
  await usarAplicativo(amb.url, ["P0101", "P0102", "P0103", "P0207"], 30, 7);
  saida.escrever("30 dias de uso do aplicativo da Beta, medidos no proxy");
  saida.escrever("rota                  chamadas  prédios  estado");
  let total = 0;
  for (const rota of Object.keys(ESTADO)) {
    let n = 0;
    const predios = new Set<string>();
    for (const [k, v] of amb.proxy.chamadas)
      if (k.startsWith(rota + "|")) {
        n += v;
        predios.add(k.split("|")[2]);
      }
    total += n;
    const col = (s: string | number, w: number) => String(s).padStart(w);
    saida.escrever(
      `${rota.padEnd(20)}${col(n, 10)}${col(predios.size, 9)}  ${ESTADO[rota]}`,
    );
  }
  saida.escrever(`total${String(total).padStart(25)}`);
  saida.escrever();
  saida.escrever("fatias pelo estado que cada rota toca:");
  saida.escrever("  comunicados: estado próprio, pode ir para o Morada sozinha");
  saida.escrever("  aptos, rateios, baixa, inadimplentes: o mesmo estado; vão juntas,");
  saida.escrever("    por cliente, depois que os dados do cliente forem migrados");
  saida.escrever(
    "  dimob: nenhuma chamada em 30 dias; candidata a desligar sem migrar",
  );
  await amb.fechar();
}
