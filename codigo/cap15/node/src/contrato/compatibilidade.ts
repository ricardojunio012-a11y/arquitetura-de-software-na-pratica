// Compara o contrato publicado com uma proposta e lista as mudanças. Incompatível é
// o que pode quebrar um cliente que já funciona: tirar algo que ele usa, mudar o que
// ele recebe ou exigir algo que ele não envia.
import { resolver, type No } from "./openapi.ts";

export interface Mudanca {
  compativel: boolean;
  texto: string;
}

type Lado = "pedido" | "resposta";

class Comparacao {
  mudancas: Mudanca[] = [];
  antigo: No;
  novo: No;

  constructor(antigo: No, novo: No) {
    this.antigo = antigo;
    this.novo = novo;
  }

  anotar(compativel: boolean, texto: string) {
    this.mudancas.push({ compativel, texto });
  }

  esquemas(a: No, b: No, lado: Lado, rotulo: string, campo: string) {
    a = resolver(this.antigo, a);
    b = resolver(this.novo, b);
    const nome = campo || "(raiz)";
    const tipoA = [a.type].flat().join(" ou ");
    const tipoB = [b.type].flat().join(" ou ");
    if (tipoA !== tipoB) {
      const mudou = `${nome} (${tipoA} → ${tipoB})`;
      return this.anotar(false, `${rotulo}: tipo mudou: ${mudou}`);
    }
    if (a.enum && b.enum) {
      // Valor novo na resposta quebra quem trata todos os casos; valor a menos no
      // pedido quebra quem o envia
      const [de, para, aviso] =
        lado === "resposta"
          ? [a.enum, b.enum, "valor novo no enum"]
          : [b.enum, a.enum, "valor removido do enum"];
      for (const valor of para) {
        if (!de.includes(valor))
          this.anotar(false, `${rotulo}: ${aviso}: ${nome} = ${valor}`);
      }
    }
    const propsA = a.properties ?? {};
    const propsB = b.properties ?? {};
    const obrigA: string[] = a.required ?? [];
    const obrigB: string[] = b.required ?? [];
    const dentro = (p: string) => (campo ? `${campo}.${p}` : p);
    for (const p of Object.keys(propsA)) {
      if (!(p in propsB)) {
        this.anotar(false, `${rotulo}: campo removido: ${dentro(p)}`);
        continue;
      }
      if (lado === "resposta" && obrigA.includes(p) && !obrigB.includes(p)) {
        this.anotar(false, `${rotulo}: campo deixou de ser garantido: ${dentro(p)}`);
      }
      if (lado === "pedido" && !obrigA.includes(p) && obrigB.includes(p)) {
        this.anotar(false, `${rotulo}: campo passou a ser obrigatório: ${dentro(p)}`);
      }
      this.esquemas(propsA[p], propsB[p], lado, rotulo, dentro(p));
    }
    for (const p of Object.keys(propsB)) {
      if (p in propsA) continue;
      if (lado === "resposta") this.anotar(true, `${rotulo}: campo novo: ${dentro(p)}`);
      else if (obrigB.includes(p)) {
        this.anotar(false, `${rotulo}: campo novo obrigatório: ${dentro(p)}`);
      } else this.anotar(true, `${rotulo}: campo novo opcional: ${dentro(p)}`);
    }
    if (a.items && b.items) this.esquemas(a.items, b.items, lado, rotulo, `${campo}[]`);
  }

  parametros(a: No[] = [], b: No[] = [], nome: string) {
    const chave = (p: No) => `${p.in} ${p.name}`;
    const novos = new Map(b.map((p) => [chave(p), p]));
    for (const pa of a) {
      const pb = novos.get(chave(pa));
      if (!pb) {
        this.anotar(false, `${nome}: parâmetro removido: ${pa.name}`);
        continue;
      }
      if (!pa.required && pb.required) {
        this.anotar(false, `${nome}: parâmetro passou a ser obrigatório: ${pa.name}`);
      }
      const rotulo = `${nome} parâmetro ${pa.name}`;
      this.esquemas(pa.schema, pb.schema, "pedido", rotulo, "");
    }
    const antigos = new Set(a.map(chave));
    for (const pb of b) {
      if (antigos.has(chave(pb))) continue;
      if (pb.required)
        this.anotar(false, `${nome}: parâmetro obrigatório novo: ${pb.name}`);
      else this.anotar(true, `${nome}: parâmetro opcional novo: ${pb.name}`);
    }
  }

  operacao(a: No, b: No, nome: string) {
    this.parametros(a.parameters, b.parameters, nome);
    const pedidoA = a.requestBody?.content?.["application/json"]?.schema;
    const pedidoB = b.requestBody?.content?.["application/json"]?.schema;
    if (pedidoA && pedidoB)
      this.esquemas(pedidoA, pedidoB, "pedido", `${nome} pedido`, "");
    for (const [status, respostaA] of Object.entries(a.responses)) {
      const conteudoA = resolver(this.antigo, respostaA).content ?? {};
      const respostaB = b.responses[status];
      if (!respostaB) continue;
      const conteudoB = resolver(this.novo, respostaB).content ?? {};
      for (const [tipo, meio] of Object.entries<No>(conteudoA)) {
        if (!conteudoB[tipo]) continue;
        const esquemaB = conteudoB[tipo].schema;
        this.esquemas(meio.schema, esquemaB, "resposta", `${nome} ${status}`, "");
      }
    }
  }
}

export function compararContratos(antigo: No, novo: No): Mudanca[] {
  const c = new Comparacao(antigo, novo);
  for (const [caminho, operacoes] of Object.entries<No>(antigo.paths)) {
    for (const [metodo, op] of Object.entries<No>(operacoes)) {
      const nome = `${metodo.toUpperCase()} ${caminho}`;
      const opNova = novo.paths[caminho]?.[metodo];
      if (opNova) c.operacao(op, opNova, nome);
      else c.anotar(false, `${nome}: operação removida`);
    }
  }
  for (const [caminho, operacoes] of Object.entries<No>(novo.paths)) {
    for (const metodo of Object.keys(operacoes)) {
      if (!antigo.paths[caminho]?.[metodo]) {
        c.anotar(true, `${metodo.toUpperCase()} ${caminho}: operação nova`);
      }
    }
  }
  return c.mudancas;
}
