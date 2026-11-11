// A API do painel do síndico, com a rota de inadimplência na versão escolhida. Conta
// as consultas e o tempo gasto no banco, o mínimo de instrumentação para saber onde
// o tempo de cada pedido vai.
import http from "node:http";
import pg from "pg";
import {
  type Consultor,
  inadimplenciaCorrigida,
  inadimplenciaN1,
} from "./inadimplencia.ts";

const versao = process.env.VERSAO;
const rota = versao === "n1" ? inadimplenciaN1 : inadimplenciaCorrigida;
const pool = new pg.Pool({ connectionString: process.env.BANCO_URL, max: 10 });

export const perfil = { consultas: 0, msNoBanco: 0 };
const medido: Consultor = {
  async query(sql, parametros) {
    const inicio = performance.now();
    try {
      return await pool.query(sql, parametros);
    } finally {
      perfil.consultas++;
      perfil.msNoBanco += performance.now() - inicio;
    }
  },
};

const servidor = http.createServer(async (pedido, resposta) => {
  const url = new URL(pedido.url ?? "/", "http://localhost");
  if (url.pathname === "/saude") return resposta.end("ok");
  if (url.pathname === "/perfil") {
    resposta.end(JSON.stringify(perfil));
    perfil.consultas = 0;
    perfil.msNoBanco = 0;
    return;
  }
  const m = url.pathname.match(/^\/condominios\/(\d+)\/inadimplentes$/);
  if (!m) {
    resposta.statusCode = 404;
    return resposta.end();
  }
  const linhas = await rota(medido, Number(m[1]));
  resposta.setHeader("content-type", "application/json");
  resposta.end(JSON.stringify(linhas));
});
servidor.listen(3000);
