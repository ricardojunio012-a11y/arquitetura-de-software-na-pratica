// Uso: node main.ts monolito|servico <pasta-de-saída>
// Envia um aviso por pagamento confirmado: pelo módulo, no mesmo processo, ou pelo
// serviço extraído, pela rede. Conta o que aconteceu e mede o tempo de cada aviso.
import fs from "node:fs";
import path from "node:path";
import { Comunicacao } from "./comunicacao.ts";

const [versao, saida] = process.argv.slice(2);
const { avisos } = JSON.parse(fs.readFileSync("/dados/entrada/carga.json", "utf8"));
const url = process.env.COMUNICACAO_URL;
const conta = {
  enviados: 0,
  chamadas: 0,
  erros: 0,
  novasTentativas: 0,
  repetidos: 0,
  perdidos: 0,
};

const espera = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms));

// Pela rede, cada chamada pode falhar: tenta até 3 vezes, sempre com o mesmo id
async function enviarPelaRede(id: string, texto: string) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    if (tentativa > 1) {
      conta.novasTentativas += 1;
      // Espera crescente (de 5 a 10 ms, depois de 10 a 20 ms), com variação,
      // para que clientes que falharam juntos não voltem todos no mesmo instante
      const teto = 10 * 2 ** (tentativa - 2);
      await espera(teto / 2 + Math.random() * (teto / 2));
    }
    conta.chamadas += 1;
    try {
      const resposta = await fetch(`${url}/avisos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, texto }),
        signal: AbortSignal.timeout(2000),
      });
      if (resposta.ok) {
        const corpo = await resposta.json();
        if (corpo.situacao === "repetido") conta.repetidos += 1;
        conta.enviados += 1;
        return;
      }
      conta.erros += 1;
    } catch {
      conta.erros += 1;
    }
  }
  conta.perdidos += 1;
}

const modulo = new Comunicacao();
if (versao === "servico") await fetch(`${url}/reiniciar`, { method: "POST" });
const tempos: number[] = [];
const inicio = performance.now();
for (let i = 1; i <= avisos; i++) {
  const id = `E-P-${String(i).padStart(3, "0")}`;
  const texto = `pagamento ${id.slice(2)} recebido`;
  const t0 = performance.now();
  if (versao === "servico") {
    await enviarPelaRede(id, texto);
  } else if (modulo.avisar(id, texto)) {
    conta.enviados += 1;
  }
  tempos.push(performance.now() - t0);
}
const total = performance.now() - inicio;

const ordenados = [...tempos].sort((a, b) => a - b);
const ms = (v: number) => `${v.toFixed(3)} ms`;
fs.mkdirSync(path.join(saida, versao), { recursive: true });
fs.writeFileSync(
  path.join(saida, versao, "resultado.txt"),
  [
    `avisos enviados: ${conta.enviados}`,
    `chamadas pela rede: ${conta.chamadas}`,
    `respostas com erro: ${conta.erros}`,
    `novas tentativas: ${conta.novasTentativas}`,
    `avisos repetidos ignorados: ${conta.repetidos}`,
    `avisos perdidos: ${conta.perdidos}`,
  ].join("\n") + "\n",
);
// Os tempos variam de máquina para máquina: ficam fora da pasta verificada
fs.writeFileSync(
  path.join(saida, `tempos-${versao}.txt`),
  [
    `tempo médio por aviso: ${ms(tempos.reduce((a, b) => a + b, 0) / tempos.length)}`,
    `p95 por aviso: ${ms(ordenados[Math.floor(ordenados.length * 0.95)])}`,
    `pior aviso: ${ms(ordenados[ordenados.length - 1])}`,
    `tempo total: ${ms(total)}`,
  ].join("\n") + "\n",
);
console.log(`${versao}: ${conta.enviados} avisos; saída em ${saida}/${versao}`);
