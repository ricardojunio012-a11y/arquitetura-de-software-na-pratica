import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { conferir, lerManifestos, milicpu } from "../src/manifestos.ts";

// No contêiner, k8s/ fica em /dados/k8s; fora dele, ao lado da pasta node/
const pasta = existsSync("/dados/k8s")
  ? "/dados/k8s"
  : fileURLToPath(new URL("../../k8s", import.meta.url));
const base = () => lerManifestos(pasta);
const falhas = (m: ReturnType<typeof base>) =>
  conferir(m)
    .filter((r) => !r.ok)
    .map((r) => r.regra);

describe("a conferência dos manifestos", () => {
  it("aprova os manifestos do capítulo", () => {
    expect(falhas(base())).toEqual([]);
  });

  it("acusa o HPA por CPU sem pedido de CPU", () => {
    const m = base();
    delete m.get("Deployment/morada-api")!.spec.template.spec.containers[0].resources
      .requests.cpu;
    expect(falhas(m)).toContain(
      "o HPA por CPU tem pedido de CPU em todos os contêineres",
    );
  });

  it("acusa o Service que não encontra os pods e a imagem latest", () => {
    const m = base();
    m.get("Service/morada-api")!.spec.selector = { app: "morada" };
    m.get("Deployment/morada-api")!.spec.template.spec.containers[0].image =
      "api:latest";
    expect(falhas(m)).toEqual([
      "imagem de api com tag fixa",
      "Service morada-api encontra os pods",
    ]);
  });

  it("acusa vida e prontidão na mesma rota", () => {
    const m = base();
    const c = m.get("Deployment/morada-api")!.spec.template.spec.containers[0];
    c.readinessProbe.httpGet.path = "/saude/vida";
    expect(falhas(m)).toEqual(["api: vida e prontidão são verificações diferentes"]);
  });

  it("converte CPU para milésimos de núcleo", () => {
    expect(milicpu("500m")).toBe(500);
    expect(milicpu("2")).toBe(2000);
  });
});
