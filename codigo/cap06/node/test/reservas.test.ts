// Testes de caracterização: descrevem o que o código faz hoje, inclusive o que
// talvez esteja errado. Mudar o comportamento é outro passo, com outro commit.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  avisos,
  decidir,
  motivoDaRecusa,
  relatorio,
  valorDaReserva,
} from "../src/etapa5/reservas.ts";

// Entrada e resultado aprovado: /dados no contêiner; fora dele, o capítulo
const pasta = (nome: string) =>
  fs.existsSync(`/dados/${nome}`)
    ? `/dados/${nome}`
    : `${import.meta.dirname}/../../${nome}`;
const ler = (nome: string, arquivo: string) =>
  fs.readFileSync(`${pasta(nome)}/${arquivo}`, "utf8");
const hoje = new Date("2026-03-02T00:00:00Z");
const salao = { id: "salao", nome: "Salão", taxa: 15000 };

describe("caracterização", () => {
  it("a saída é idêntica ao resultado aprovado (golden master)", () => {
    const decisoes = decidir(JSON.parse(ler("entrada", "reservas.json")), hoje);
    const emails = avisos(decisoes).map((a) => `para ${a.para}: ${a.texto}`);
    expect(relatorio(decisoes).join("\n") + "\n").toBe(ler("esperado", "reservas.txt"));
    expect(emails.join("\n") + "\n").toBe(ler("esperado", "emails.txt"));
  });

  it("domingo não tem acréscimo de fim de semana (comportamento atual)", () => {
    const domingo = {
      id: "R",
      unidade: "A",
      espaco: "salao",
      data: "2026-03-15",
      convidados: 1,
    };
    const sabado = { ...domingo, data: "2026-03-14" };
    expect(valorDaReserva(salao, domingo)).toBe(15000);
    expect(valorDaReserva(salao, sabado)).toBe(18000);
  });

  it("a primeira regra que falha decide o motivo", () => {
    const pedido = {
      id: "R",
      unidade: "A",
      espaco: "salao",
      data: "2026-03-03",
      convidados: 1,
    };
    const emDebito = { id: "A", email: "a@x.com", emDebito: true };
    expect(motivoDaRecusa(pedido, emDebito, hoje, [])).toBe("débito");
    expect(motivoDaRecusa(pedido, { ...emDebito, emDebito: false }, hoje, [])).toBe(
      "antecedência",
    );
  });
});
