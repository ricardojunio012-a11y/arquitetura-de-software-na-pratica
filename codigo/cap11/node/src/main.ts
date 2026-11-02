// Uso: node main.ts memoria|escrita-dupla|outbox <pasta-de-saída>
// O Financeiro confirma três pagamentos; Reservas e Comunicação reagem ao evento.
import fs from "node:fs";
import path from "node:path";
import { conectarBanco, gravarComOutbox, gravarPagamento } from "./infra/banco.ts";
import { conectarBroker, consumirTudo, FILAS, publicar } from "./infra/broker.ts";
import { eventoDe, type Pagamento, type PagamentoConfirmado } from "./eventos.ts";
import { Comunicacao } from "./modulos/comunicacao.ts";
import { Reservas } from "./modulos/reservas.ts";

const [versao, saida] = process.argv.slice(2);
const cenario = JSON.parse(fs.readFileSync("/dados/entrada/cenario.json", "utf8"));
const pagamentos: Pagamento[] = cenario.pagamentos;
const reservas = new Reservas(cenario.reservas);
const comunicacao = new Comunicacao();
const execucao: string[] = [];

// Barramento em memória: os assinantes rodam na hora, no mesmo processo
function rodarEmMemoria() {
  const assinantes = [
    (e: PagamentoConfirmado) => reservas.aoConfirmarPagamento(e),
    (e: PagamentoConfirmado) => comunicacao.aoConfirmarPagamento(e),
  ];
  for (const p of pagamentos) {
    const e = eventoDe(p);
    execucao.push(`${p.pagamento} confirmado; ${e.evento} entregue em memória`);
    for (const assinante of assinantes) assinante(e);
  }
}

async function rodarComBroker(comOutbox: boolean) {
  const banco = await conectarBanco();
  const { canal, fechar } = await conectarBroker();
  for (const p of pagamentos) {
    const e = eventoDe(p);
    if (comOutbox) {
      await gravarComOutbox(banco, p, e);
      execucao.push(`${p.pagamento} gravado com ${e.evento} na outbox`);
      continue;
    }
    // Escrita dupla: grava no banco e depois publica, em dois passos separados
    await gravarPagamento(banco, p);
    if (p.falha === "depois-de-gravar") {
      execucao.push(`${p.pagamento} gravado; o processo caiu antes de publicar`);
      continue;
    }
    await publicar(canal, e);
    execucao.push(`${p.pagamento} gravado; ${e.evento} publicado`);
  }
  if (comOutbox) {
    const caiAntesDeMarcar = new Set(
      pagamentos
        .filter((p) => p.falha === "relay-antes-de-marcar")
        .map((p) => `E-${p.pagamento}`),
    );
    await rodarRelay(banco, canal, caiAntesDeMarcar);
    await rodarRelay(banco, canal, caiAntesDeMarcar);
  }
  await consumirTudo(canal, FILAS[0], (e) => reservas.aoConfirmarPagamento(e));
  await consumirTudo(canal, FILAS[1], (e) => comunicacao.aoConfirmarPagamento(e));
  await fechar();
  await banco.end();
}

// O relay lê a outbox e publica o que falta; só marca como publicado depois
async function rodarRelay(
  banco: Awaited<ReturnType<typeof conectarBanco>>,
  canal: Awaited<ReturnType<typeof conectarBroker>>["canal"],
  caiAntesDeMarcar: Set<string>,
) {
  const { rows } = await banco.query(
    "SELECT id, evento, conteudo FROM outbox WHERE NOT publicado ORDER BY id",
  );
  for (const linha of rows) {
    await publicar(canal, JSON.parse(linha.conteudo));
    if (caiAntesDeMarcar.delete(linha.evento)) {
      execucao.push(`relay publicou ${linha.evento} e caiu antes de marcar`);
      return;
    }
    await banco.query("UPDATE outbox SET publicado = true WHERE id = $1", [linha.id]);
    execucao.push(`relay publicou ${linha.evento}`);
  }
}

if (versao === "memoria") rodarEmMemoria();
else await rodarComBroker(versao === "outbox");

fs.mkdirSync(saida, { recursive: true });
const gravar = (nome: string, linhas: string[]) =>
  fs.writeFileSync(path.join(saida, nome), linhas.join("\n") + "\n");
gravar("execucao.txt", execucao);
gravar("consumo.txt", [...reservas.registro, ...comunicacao.registro]);
gravar("resultado.txt", [...reservas.linhas(), ...comunicacao.avisos]);
console.log(`${versao}: saída em ${saida}`);
