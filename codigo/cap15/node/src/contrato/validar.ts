// Confere uma resposta real contra o contrato: o status precisa estar documentado, o
// tipo de conteúdo também, e o corpo precisa seguir o esquema.
import { encontrarCaminho, resolver, type No } from "./openapi.ts";

function tipoDe(valor: unknown): string {
  if (valor === null) return "null";
  if (Array.isArray(valor)) return "array";
  if (Number.isInteger(valor)) return "integer";
  return typeof valor;
}

function validarEsquema(contrato: No, esquema: No, valor: No, onde: string): string[] {
  esquema = resolver(contrato, esquema);
  const tipos = [esquema.type].flat();
  const tipo = tipoDe(valor);
  if (esquema.type && !tipos.includes(tipo)) {
    return [`${onde}: esperado ${tipos.join(" ou ")}, recebido ${tipo}`];
  }
  if (esquema.enum && !esquema.enum.includes(valor)) {
    return [`${onde}: valor fora do enum: ${valor}`];
  }
  const erros: string[] = [];
  if (tipo === "object") {
    for (const campo of esquema.required ?? []) {
      if (!(campo in valor)) erros.push(`${onde}.${campo}: campo obrigatório ausente`);
    }
    for (const [campo, sub] of Object.entries(esquema.properties ?? {})) {
      if (campo in valor) {
        erros.push(...validarEsquema(contrato, sub, valor[campo], `${onde}.${campo}`));
      }
    }
  }
  if (tipo === "array" && esquema.items) {
    valor.forEach((item: No, i: number) => {
      erros.push(...validarEsquema(contrato, esquema.items, item, `${onde}[${i}]`));
    });
  }
  return erros;
}

export function validarResposta(
  contrato: No,
  metodo: string,
  caminho: string,
  status: number,
  tipo: string,
  corpo: No,
): string[] {
  const modelo = encontrarCaminho(contrato, caminho);
  const operacao = modelo && contrato.paths[modelo][metodo.toLowerCase()];
  if (!operacao) return [`${metodo} ${caminho}: operação fora do contrato`];
  const nome = `${metodo} ${modelo} ${status}`;
  const resposta = resolver(contrato, operacao.responses[String(status)]);
  if (!resposta) return [`${nome}: status não documentado`];
  const conteudo = resposta.content?.[tipo];
  if (!conteudo) return [`${nome}: tipo de conteúdo não documentado: ${tipo}`];
  return validarEsquema(contrato, conteudo.schema, corpo, "$").map(
    (e) => `${nome}: ${e}`,
  );
}
