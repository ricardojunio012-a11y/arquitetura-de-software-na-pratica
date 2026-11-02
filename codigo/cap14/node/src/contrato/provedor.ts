// Verificação do contrato do lado do provedor. Lê o contrato publicado pelo
// consumidor, prepara o estado pedido em cada interação, envia o pedido à API real
// da Comunicação e compara a resposta com a combinada.
import fs from "node:fs";
import path from "node:path";
import { criarApi, subir } from "../comunicacao/api.ts";
import { AvisosEmMemoria, Comunicacao } from "../comunicacao/dominio.ts";
import type { Interacao } from "./interacoes.ts";

const saida = process.argv[2];
const contrato = JSON.parse(
  fs.readFileSync(path.join(saida, "consumidor", "contrato.json"), "utf8"),
);

// Cada estado do contrato tem uma preparação do lado do provedor
const estados: Record<string, (c: Comunicacao) => Promise<unknown>> = {
  "nenhum aviso foi enviado": async () => {},
  "o aviso E-P-001 já foi enviado": (c) => c.avisar("E-P-001", "pagamento recebido"),
};

// A resposta cumpre o contrato se tem o status combinado e os campos que o
// consumidor declarou. Campos a mais não quebram ninguém.
function cumpre(obtido: Interacao["resposta"], esperado: Interacao["resposta"]) {
  const corpo = obtido.corpo as Record<string, unknown>;
  return (
    obtido.status === esperado.status &&
    Object.entries(esperado.corpo).every(([campo, valor]) => corpo[campo] === valor)
  );
}

const relatorio: string[] = [];
for (const interacao of contrato.interacoes as Interacao[]) {
  const comunicacao = new Comunicacao(new AvisosEmMemoria());
  await estados[interacao.estado](comunicacao);
  const api = criarApi(comunicacao);
  const url = await subir(api);
  const resposta = await fetch(url + interacao.requisicao.caminho, {
    method: interacao.requisicao.metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(interacao.requisicao.corpo),
  });
  const obtido = { status: resposta.status, corpo: await resposta.json() };
  api.close();
  const esperado = JSON.stringify(interacao.resposta);
  const recebido = JSON.stringify(obtido);
  relatorio.push(
    cumpre(obtido, interacao.resposta)
      ? `${interacao.descricao}: verificada`
      : `${interacao.descricao}: FALHOU (esperado ${esperado}, recebido ${recebido})`,
  );
}

fs.mkdirSync(path.join(saida, "provedor"), { recursive: true });
fs.writeFileSync(
  path.join(saida, "provedor", "relatorio.txt"),
  relatorio.join("\n") + "\n",
);
console.log(`provedor: ${relatorio.length} interações verificadas`);
process.exitCode = relatorio.some((l) => l.includes("FALHOU")) ? 1 : 0;
