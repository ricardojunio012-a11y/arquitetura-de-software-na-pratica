// O proxy na frente do legado. Todo pedido do aplicativo da Beta passa por ele, e
// uma tabela de regras decide, por rota e por prédio, quem responde.
import { chamar, partes, type Resposta, type Tratador } from "./http.ts";

export type Destino = "legado" | "morada" | "sombra" | "desligada";
export type Regra = { rota: string; predios?: string[]; destino: Destino };

// "GET /predios/P0101/rateios?comp=10/2026" é a rota "GET rateios"
export function rotaDe(metodo: string, caminho: string): string {
  const { seg } = partes(caminho);
  if (seg[0] === "relatorios") return `${metodo} ${seg[1]}`;
  return `${metodo} ${seg[4] ?? seg[2]}`;
}

export type Divergencia = { chave: string; tipo: string };
export type Contagem = Map<string, number>;

export class ProxyBeta {
  regras: Regra[] = [];
  chamadas: Contagem = new Map(); // "rota|destino|prédio" -> chamadas
  comparacoes = 0;
  iguais = 0;
  divergencias: (Divergencia & { rota: string })[] = [];

  legado: string;
  novo: Tratador; // a camada de compatibilidade sobre o Morada

  constructor(legado: string, novo: Tratador) {
    this.legado = legado;
    this.novo = novo;
  }

  destino(rota: string, predio: string): Destino {
    const r = this.regras.find(
      (r) => r.rota === rota && (!r.predios || r.predios.includes(predio)),
    );
    return r?.destino ?? "legado";
  }

  tratar: Tratador = async (metodo, caminho, corpo) => {
    const rota = rotaDe(metodo, caminho);
    const predio = partes(caminho).seg[1] ?? "-";
    const destino = this.destino(rota, predio);
    const chave = `${rota}|${destino}|${predio}`;
    this.chamadas.set(chave, (this.chamadas.get(chave) ?? 0) + 1);

    if (destino === "desligada")
      return {
        status: 410,
        corpo: { erro: "ROTA DESLIGADA", use: "relatórios do Morada" },
      };
    if (destino === "morada") return this.novo(metodo, caminho, corpo);
    const velho = await chamar(this.legado, metodo, caminho, corpo);
    if (destino === "sombra")
      await this.experimento(rota, metodo, caminho, corpo, velho);
    return velho; // na sombra, quem responde ao aplicativo é sempre o legado
  };

  // A execução paralela: o novo roda com o mesmo pedido, e a diferença é registrada.
  // Leituras são comparadas; escritas que deram certo no legado são repetidas no
  // Morada (interceptação), para que a cópia continue igual.
  private async experimento(
    rota: string,
    metodo: string,
    caminho: string,
    corpo: unknown,
    velho: Resposta,
  ): Promise<void> {
    if (metodo === "POST" && velho.status !== 200) return;
    const novo = await this.novo(metodo, caminho, corpo);
    this.comparacoes++;
    const difs =
      metodo === "POST"
        ? novo.status === velho.status
          ? []
          : [{ chave: partes(caminho).seg[3], tipo: "escrita recusada" }]
        : comparar(velho.corpo as Item[], novo.corpo as Item[]);
    if (difs.length === 0) this.iguais++;
    const predio = partes(caminho).seg[1];
    for (const d of difs)
      this.divergencias.push({ ...d, chave: `${predio}/${d.chave}`, rota });
  }
}

type Item = Record<string, unknown> & { apto: string; comp?: string };

// Compara duas listas do contrato da Beta, item por item, e classifica a diferença
export function comparar(velho: Item[], novo: Item[]): Divergencia[] {
  const chave = (i: Item) => (i.comp ? `${i.apto} ${i.comp}` : i.apto);
  const mapa = new Map(novo.map((i) => [chave(i), i]));
  const difs: Divergencia[] = [];
  for (const v of velho) {
    const n = mapa.get(chave(v));
    mapa.delete(chave(v));
    if (!n) difs.push({ chave: chave(v), tipo: "ausente no Morada" });
    else if (JSON.stringify(v) !== JSON.stringify(n))
      difs.push({ chave: chave(v), tipo: tipoDaDiferenca(v, n) });
  }
  for (const k of mapa.keys()) difs.push({ chave: k, tipo: "sobrando no Morada" });
  return difs;
}

// Até 2 centavos no valor, e nada mais diferente: arredondamento, que o ADR aceita
function tipoDaDiferenca(v: Item, n: Item): string {
  const campo = "valor" in v ? "valor" : "total";
  const centavos = (x: unknown) => Number(String(x).replace(/\D/g, ""));
  const resto = (i: Item) => JSON.stringify({ ...i, [campo]: null });
  const delta = Math.abs(centavos(v[campo]) - centavos(n[campo]));
  if (resto(v) === resto(n) && delta <= 2) return "arredondamento (aceita)";
  return "diferente";
}
