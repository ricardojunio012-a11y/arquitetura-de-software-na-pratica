// O banco do sistema da Beta, o concorrente comprado. É um SQLite em memória com o
// esquema e os hábitos de um sistema de 2009: cada torre é um "prédio", a vaga de
// garagem é um "apto", e datas, valores e frações são texto no formato brasileiro.
import { DatabaseSync } from "node:sqlite";
import { gerador } from "../comum.ts";

export const ACACIAS = "12.345.678/0001-90";
export const IPES = "98.765.432/0001-10";
export const ESQUEMA = `
  CREATE TABLE predio (cod TEXT PRIMARY KEY, nome TEXT, cnpj TEXT,
                       somente_leitura TEXT DEFAULT 'N');
  CREATE TABLE apto (cod_predio TEXT, apto TEXT, tipo TEXT, fracao TEXT,
                     proprietario TEXT, vinculo TEXT, obs TEXT,
                     PRIMARY KEY (cod_predio, apto));
  CREATE TABLE orcamento (cnpj TEXT, comp TEXT, valor TEXT);
  CREATE TABLE rateio (cod_predio TEXT, apto TEXT, comp TEXT, vencto TEXT,
                       valor TEXT, pago TEXT, dt_pagto TEXT,
                       PRIMARY KEY (cod_predio, apto, comp));
  CREATE TABLE comunicado (id INTEGER PRIMARY KEY, cod_predio TEXT, titulo TEXT);
`;

// Valores e frações em texto, como o legado grava: "1.048,72" e "0,036496"
export const paraTexto = (cent: number) =>
  (cent / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+,)/g, ".");
export const deTexto = (t: string) => Number(t.replace(/\./g, "").replace(",", "."));

const NOMES = ["Ana", "Bruno", "Carla", "Davi", "Elisa", "Fábio", "Gil", "Helena"];

export function criarLegado(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(ESQUEMA);
  const predio = db.prepare("INSERT INTO predio (cod, nome, cnpj) VALUES (?, ?, ?)");
  predio.run("P0101", "RES ACACIAS TORRE A", ACACIAS);
  predio.run("P0102", "RES ACACIAS TORRE B", ACACIAS);
  predio.run("P0103", "RES ACACIAS TORRE C", ACACIAS);
  predio.run("P0207", "ED IPES", IPES);

  // Peso de cada apto: final 01 = 1,0; final 02 = 1,2; vaga = 0,1
  const aptos: [string, string, string, number, string, string][] = [];
  for (const cod of ["P0101", "P0102", "P0103"])
    for (let andar = 1; andar <= 4; andar++)
      for (const fim of ["01", "02"])
        aptos.push([cod, `0${andar}${fim}`, "A", fim === "01" ? 1 : 1.2, "", ""]);
  // A garagem do condomínio inteiro foi cadastrada na torre A
  const vinculos = ["P0101/0102", "P0101/0301", "P0102/0101", "P0102/0202"];
  vinculos.push("P0102/0401", "P0103/0102", "P0103/0201", "P0103/0302", "", "");
  vinculos.forEach((v, i) =>
    aptos.push(["P0101", `G-${String(i + 1).padStart(2, "0")}`, "G", 0.1, v, ""]),
  );
  for (let andar = 1; andar <= 6; andar++)
    for (const fim of ["01", "02"])
      aptos.push(["P0207", `0${andar}${fim}`, "A", fim === "01" ? 1 : 1.2, "", ""]);
  aptos[0][5] = "SINDICO - ISENTO TX"; // P0101/0101
  aptos[13][5] = "LIGAR APOS 18H"; // P0102/0302

  const inserir = db.prepare("INSERT INTO apto VALUES (?, ?, ?, ?, ?, ?, ?)");
  const cnpjDe = (cod: string) => (cod === "P0207" ? IPES : ACACIAS);
  const total = (cnpj: string) =>
    aptos.filter((a) => cnpjDe(a[0]) === cnpj).reduce((s, a) => s + a[3], 0);
  aptos.forEach(([cod, ap, tipo, peso, vinculo, obs], i) => {
    const fracao = (peso / total(cnpjDe(cod))).toFixed(6).replace(".", ",");
    inserir.run(cod, ap, tipo, fracao, NOMES[i % 8], vinculo, obs);
  });

  const orc = db.prepare("INSERT INTO orcamento VALUES (?, ?, ?)");
  for (const comp of ["08/2026", "09/2026", "10/2026", "11/2026"]) {
    orc.run(ACACIAS, comp, "28.735,40");
    orc.run(IPES, comp, "9.876,50");
  }

  // Os três meses fechados, com pagamentos sorteados com semente fixa
  const sorteio = gerador(41);
  for (const comp of ["08/2026", "09/2026", "10/2026"]) {
    calcularRateio(db, ACACIAS, comp);
    calcularRateio(db, IPES, comp);
    const linhas = db.prepare("SELECT cod_predio, apto FROM rateio WHERE comp = ?");
    const pagar = db.prepare(
      "UPDATE rateio SET pago = 'S', dt_pagto = ? WHERE cod_predio = ? AND apto = ? " +
        "AND comp = ? AND valor <> '0,00'",
    );
    for (const r of linhas.all(comp) as { cod_predio: string; apto: string }[]) {
      if (sorteio() < 0.85) {
        const dia = String(3 + Math.floor(sorteio() * 10)).padStart(2, "0");
        pagar.run(`${dia}/${comp}`, r.cod_predio, r.apto, comp);
      }
    }
  }
  return db;
}

// O cálculo do rateio do legado, traduzido da rotina original. Note a regra da
// isenção: ela não está num campo próprio, e sim no texto livre da observação.
export function calcularRateio(db: DatabaseSync, cnpj: string, comp: string): void {
  const orc = db
    .prepare("SELECT valor FROM orcamento WHERE cnpj = ? AND comp = ?")
    .get(cnpj, comp) as { valor: string };
  const aptos = db
    .prepare(
      "SELECT a.* FROM apto a JOIN predio p ON p.cod = a.cod_predio WHERE p.cnpj = ?",
    )
    .all(cnpj) as { cod_predio: string; apto: string; fracao: string; obs: string }[];
  const inserir = db.prepare("INSERT INTO rateio VALUES (?, ?, ?, ?, ?, 'N', '')");
  for (const a of aptos) {
    let cent = Math.trunc(deTexto(orc.valor) * deTexto(a.fracao) * 100);
    if (a.obs.toUpperCase().includes("SINDICO")) cent = 0;
    inserir.run(a.cod_predio, a.apto, comp, `10/${comp}`, paraTexto(cent));
  }
}
