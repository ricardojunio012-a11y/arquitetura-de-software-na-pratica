// Lê os manifestos de k8s/ e confere se eles combinam entre si. São regras que o
// Kubernetes aceitaria quebradas sem reclamar: o erro só aparece em produção.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";

type Objeto = { kind: string; metadata: { name: string }; spec: any };
export type Manifestos = Map<string, Objeto>; // chave: "Kind/nome"

export function lerManifestos(pasta: string): Manifestos {
  const todos: Manifestos = new Map();
  for (const arquivo of readdirSync(pasta)
    .filter((a) => a.endsWith(".yaml"))
    .sort()) {
    for (const doc of parseAllDocuments(readFileSync(join(pasta, arquivo), "utf8"))) {
      const o = doc.toJS() as Objeto;
      if (o) todos.set(`${o.kind}/${o.metadata.name}`, o);
    }
  }
  return todos;
}

export type Regra = { regra: string; ok: boolean; detalhe: string };

// Converte "500m" e "1" (CPU) para milésimos de núcleo
export function milicpu(valor: string | number | undefined): number {
  if (valor === undefined) return 0;
  const s = String(valor);
  return s.endsWith("m") ? Number(s.slice(0, -1)) : Number(s) * 1000;
}

// Regras da conferência
export function conferir(m: Manifestos): Regra[] {
  const regras: Regra[] = [];
  const r = (regra: string, ok: boolean, detalhe: string) =>
    regras.push({ regra, ok, detalhe });
  const dep = [...m.values()].find((o) => o.kind === "Deployment");
  if (!dep) return [{ regra: "existe um Deployment", ok: false, detalhe: "nenhum" }];
  const rotulos = dep.spec.template.metadata.labels ?? {};
  const seleciona = (sel: Record<string, string> = {}) =>
    Object.keys(sel).length > 0 &&
    Object.entries(sel).every(([k, v]) => rotulos[k] === v);
  const conts: any[] = dep.spec.template.spec.containers;
  const portas = new Set(conts.flatMap((c) => (c.ports ?? []).map((p: any) => p.name)));

  r(
    "o Deployment seleciona os seus pods",
    seleciona(dep.spec.selector.matchLabels),
    JSON.stringify(dep.spec.selector.matchLabels),
  );
  for (const c of conts) {
    const tag = String(c.image).split(":")[1];
    r(`imagem de ${c.name} com tag fixa`, !!tag && tag !== "latest", c.image);
    r(
      `${c.name} pede CPU e memória`,
      milicpu(c.resources?.requests?.cpu) > 0 && !!c.resources?.requests?.memory,
      JSON.stringify(c.resources?.requests ?? {}),
    );
    r(
      `${c.name} tem limite de memória`,
      !!c.resources?.limits?.memory,
      c.resources?.limits?.memory ?? "sem limite",
    );
    const vida = c.livenessProbe?.httpGet?.path;
    const pronta = c.readinessProbe?.httpGet?.path;
    r(
      `${c.name}: vida e prontidão são verificações diferentes`,
      !!vida && !!pronta && vida !== pronta,
      `${vida} e ${pronta}`,
    );
    const partida = c.startupProbe
      ? c.startupProbe.periodSeconds * c.startupProbe.failureThreshold
      : 0;
    r(`${c.name}: a partida tem prazo próprio`, partida >= 20, `${partida} s`);
  }
  for (const svc of [...m.values()].filter((o) => o.kind === "Service")) {
    r(
      `Service ${svc.metadata.name} encontra os pods`,
      seleciona(svc.spec.selector),
      JSON.stringify(svc.spec.selector),
    );
    for (const p of svc.spec.ports) {
      const alvo = p.targetPort;
      r(
        `Service ${svc.metadata.name}: porta ${alvo} existe no contêiner`,
        typeof alvo === "number" || portas.has(alvo),
        String(alvo),
      );
    }
  }
  for (const rota of [...m.values()].filter((o) => o.kind === "HTTPRoute")) {
    for (const b of rota.spec.rules.flatMap((x: any) => x.backendRefs)) {
      const svc = m.get(`Service/${b.name}`);
      r(
        `HTTPRoute ${rota.metadata.name} aponta para um Service que existe`,
        !!svc && svc.spec.ports.some((p: any) => p.port === b.port),
        `${b.name}:${b.port}`,
      );
    }
  }
  const hpa = [...m.values()].find((o) => o.kind === "HorizontalPodAutoscaler");
  if (hpa) {
    const alvo = hpa.spec.scaleTargetRef;
    r(
      "o HPA aponta para o Deployment",
      alvo.kind === "Deployment" && alvo.name === dep.metadata.name,
      alvo.name,
    );
    const porCpu = hpa.spec.metrics.some((x: any) => x.resource?.name === "cpu");
    r(
      "o HPA por CPU tem pedido de CPU em todos os contêineres",
      !porCpu || conts.every((c) => milicpu(c.resources?.requests?.cpu) > 0),
      porCpu ? "métrica cpu" : "sem métrica de CPU",
    );
    const pdb = [...m.values()].find((o) => o.kind === "PodDisruptionBudget");
    if (pdb)
      r(
        "o PodDisruptionBudget deixa um nó ser esvaziado",
        pdb.spec.minAvailable < hpa.spec.minReplicas,
        `minAvailable ${pdb.spec.minAvailable}, minReplicas ${hpa.spec.minReplicas}`,
      );
  }
  return regras;
}

// Os valores que a simulação usa, lidos dos próprios manifestos
export type Configuracao = {
  cpuPorPod: number; // milésimos de núcleo pedidos por réplica
  minimo: number;
  maximo: number;
  alvo: number; // % de utilização da CPU pedida
  janelaReducao: number; // segundos
};

export function configuracao(m: Manifestos): Configuracao {
  const dep = [...m.values()].find((o) => o.kind === "Deployment")!;
  const hpa = [...m.values()].find((o) => o.kind === "HorizontalPodAutoscaler")!;
  const cpu = hpa.spec.metrics.find((x: any) => x.resource?.name === "cpu");
  return {
    cpuPorPod: dep.spec.template.spec.containers
      .map((c: any) => milicpu(c.resources?.requests?.cpu))
      .reduce((a: number, b: number) => a + b, 0),
    minimo: hpa.spec.minReplicas ?? 1,
    maximo: hpa.spec.maxReplicas,
    alvo: cpu.resource.target.averageUtilization,
    janelaReducao: hpa.spec.behavior?.scaleDown?.stabilizationWindowSeconds ?? 300,
  };
}
