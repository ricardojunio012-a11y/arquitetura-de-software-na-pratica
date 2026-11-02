// Uso: node main.ts <comandos.json> <pasta-de-saída>
// Monta o repositório e o serviço de aplicação e executa os comandos em ordem.
import fs from "node:fs";
import path from "node:path";
import { AgendasEmMemoria } from "./aplicacao/repositorio.ts";
import { ServicoDeReservas, type Comando } from "./aplicacao/servico-de-reservas.ts";
import type { PoliticaDeUso } from "./dominio/agenda.ts";
import { Dinheiro } from "./dominio/dinheiro.ts";
import type { EventoDeDominio } from "./dominio/eventos.ts";

const [entrada, saida] = process.argv.slice(2);
const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
const politicas = new Map<string, PoliticaDeUso>(
  dados.espacos.map((e: any) => [
    e.id,
    {
      taxa: Dinheiro.deCentavos(e.taxaCentavos),
      antecedenciaMinimaDias: e.antecedenciaMinimaDias,
      limitePorMes: e.limitePorMes,
    },
  ]),
);

const eventos: string[] = [];
const publicar = (e: EventoDeDominio) =>
  eventos.push(
    e.tipo === "ReservaConfirmada"
      ? `${e.tipo};${e.reserva};${e.espaco};${e.periodo};${e.unidade};${e.taxa}`
      : `${e.tipo};${e.reserva};${e.multa.centavos ? `multa ${e.multa}` : "sem multa"}`,
  );
const agendas = new AgendasEmMemoria(politicas);
const servico = new ServicoDeReservas(agendas, publicar);

const resultados = (dados.comandos as Comando[]).map((c) => {
  const r = servico.executar(c);
  return `${r.reserva};${r.comando};${r.situacao};${r.detalhe}`;
});
const agenda = agendas
  .todas()
  .flatMap((a) =>
    a.ativas().map((r) => `${a.espaco};${r.id};${r.periodo};${r.unidade}`),
  );

fs.mkdirSync(saida, { recursive: true });
for (const [nome, linhas] of Object.entries({ resultados, eventos, agenda })) {
  fs.writeFileSync(path.join(saida, `${nome}.txt`), linhas.join("\n") + "\n");
}
console.log(`${resultados.length} comandos executados; saída em ${saida}`);
