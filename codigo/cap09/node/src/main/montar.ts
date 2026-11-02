// Raiz de composição: o único lugar que escolhe os adaptadores e os liga ao núcleo.
import fs from "node:fs";
import pg from "pg";
import { ServicoDeReservas } from "../aplicacao/servico-de-reservas.ts";
import { AgendasEmMemoria } from "../adaptadores/saida/em-memoria.ts";
import { AgendasNoPostgres } from "../adaptadores/saida/postgres.ts";

export async function montar(repositorio: string, preparar = false) {
  const { espacos } = JSON.parse(
    fs.readFileSync("/dados/entrada/espacos.json", "utf8"),
  );
  if (repositorio === "memoria") {
    const agendas = new AgendasEmMemoria(espacos);
    return { servico: new ServicoDeReservas(agendas), agendas, fechar: async () => {} };
  }
  const banco = new pg.Client({ connectionString: process.env.BANCO_URL });
  await banco.connect();
  const agendas = new AgendasNoPostgres(banco, espacos);
  if (preparar) await agendas.preparar();
  return {
    servico: new ServicoDeReservas(agendas),
    agendas,
    fechar: () => banco.end(),
  };
}
