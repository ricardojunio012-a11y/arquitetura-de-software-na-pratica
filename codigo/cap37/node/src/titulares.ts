// Gravar, ler, exportar e eliminar os dados de um titular.
import type pg from "pg";
import type { Cofre } from "./cofre.ts";
import { cifrar, decifrar } from "./cripto.ts";
import type { Evento, Morador } from "./dados.ts";

type Campos = Record<string, string>;
const PREFIXO = "c1:"; // marca um valor cifrado

// Sem cofre (versão ingênua), o dado pessoal é gravado em claro.
export async function proteger(
  cofre: Cofre | undefined,
  titular: number,
  campos: Campos,
): Promise<Campos> {
  if (!cofre) return campos;
  const chave = (await cofre.chave(titular)) ?? (await cofre.criar(titular));
  const protegidos: Campos = {};
  for (const [nome, valor] of Object.entries(campos))
    protegidos[nome] = PREFIXO + cifrar(chave, valor);
  return protegidos;
}

// Sem a chave do titular, não há como ler: devolve undefined.
export async function revelar(
  cofre: Cofre | undefined,
  titular: number,
  campos: Campos,
): Promise<Campos | undefined> {
  const cifrados = Object.values(campos).some((v) => v.startsWith(PREFIXO));
  if (!cifrados) return campos;
  const chave = await cofre?.chave(titular);
  if (!chave) return undefined;
  const claros: Campos = {};
  for (const [nome, valor] of Object.entries(campos))
    claros[nome] = valor.startsWith(PREFIXO)
      ? decifrar(chave, valor.slice(PREFIXO.length))
      : valor; // campo público, gravado em claro
  return claros;
}

export async function cadastrar(db: pg.Client, cofre: Cofre | undefined, m: Morador) {
  const p = await proteger(cofre, m.titular, {
    nome: m.nome,
    cpf: m.cpf,
    email: m.email,
  });
  await db.query("INSERT INTO cadastro.moradores VALUES ($1, $2, $3, $4, $5)", [
    m.titular,
    m.unidade,
    p.nome,
    p.cpf,
    p.email,
  ]);
  await db.query(
    "INSERT INTO cadastro.cobrancas (titular, unidade, competencia, " +
      "valor_centavos, paga) VALUES ($1, $2, '2026-10', 89000, true)",
    [m.titular, m.unidade],
  );
}

export async function publicar(db: pg.Client, cofre: Cofre | undefined, e: Evento) {
  const dados = { ...e.publicos, ...(await proteger(cofre, e.titular, e.pessoais)) };
  await db.query(
    "INSERT INTO eventos.publicados (titular, tipo, momento, dados) " +
      "VALUES ($1, $2, $3, $4)",
    [e.titular, e.tipo, e.momento, dados],
  );
}

// Direito de acesso (art. 18, II): tudo o que o Morada guarda do titular
export async function exportar(db: pg.Client, cofre: Cofre | undefined, t: number) {
  const um = async (sql: string) => (await db.query(sql, [t])).rows;
  const [m] = await um("SELECT * FROM cadastro.moradores WHERE titular = $1");
  const cobrancas = await um(
    "SELECT unidade, competencia, valor_centavos, paga FROM cadastro.cobrancas " +
      "WHERE titular = $1 ORDER BY id",
  );
  const evs = await um(
    "SELECT tipo, momento, dados FROM eventos.publicados " +
      "WHERE titular = $1 ORDER BY seq",
  );
  const cadastro = await revelar(cofre, t, {
    nome: m.nome,
    cpf: m.cpf,
    email: m.email,
  });
  const eventos = [];
  for (const e of evs)
    eventos.push({
      tipo: e.tipo,
      momento: e.momento,
      dados: await revelar(cofre, t, e.dados),
    });
  return { titular: t, unidade: m.unidade, cadastro, cobrancas, eventos };
}

// Versão ingênua: apaga só a linha do cadastro.
export async function apagarDoCadastro(db: pg.Client, titular: number) {
  await db.query("DELETE FROM cadastro.moradores WHERE titular = $1", [titular]);
}

// Crypto-shredding: o cadastro sai do banco, e a chave sai do cofre. Os eventos
// já publicados e os backups não mudam, mas ninguém mais consegue lê-los. As
// cobranças ficam, porque guardam só a unidade, o valor e o número do titular.
export async function esquecer(db: pg.Client, cofre: Cofre, titular: number) {
  await apagarDoCadastro(db, titular);
  await cofre.destruir(titular);
}
