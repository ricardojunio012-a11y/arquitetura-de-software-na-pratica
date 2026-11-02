// Uso: node contatos.ts <pasta-de-saída>
// A parte difícil da extração. Para avisar, a Comunicação precisa do e-mail do
// morador, que pertence ao Cadastro e, no monólito, vinha de uma junção com a
// tabela dele. Fora do monólito, sem tabela compartilhada, há dois caminhos:
// consultar o Cadastro por API a cada aviso ou manter uma réplica dos contatos,
// alimentada pelos eventos ContatoAlterado. Um relógio simulado, em minutos,
// deixa a saída igual em qualquer máquina: um aviso por minuto, e o Cadastro
// fora do ar por 10 minutos.
import fs from "node:fs";
import path from "node:path";

interface Mudanca {
  minuto: number;
  unidade: string;
  email: string;
}
const cenario = JSON.parse(fs.readFileSync("/dados/entrada/contatos.json", "utf8"));
const mudancas: Mudanca[] = cenario.mudancas;
const { de, ate } = cenario.cadastroFora;
const atraso: number = cenario.atrasoDaReplica;
const [saida] = process.argv.slice(2);

const dois = (n: number) => String(n).padStart(2, "0");
const unidadeDo = (aviso: number) => `U-${dois(((aviso - 1) % cenario.unidades) + 1)}`;
const idDo = (aviso: number) => `E-P-${String(aviso).padStart(3, "0")}`;
const cadastroNoAr = (minuto: number) => minuto < de || minuto > ate;

// O e-mail de uma unidade num minuto, contando as mudanças que já valiam
function emailEm(unidade: string, minuto: number, atrasoDaCopia = 0) {
  let email = `morador.${unidade.toLowerCase().replace("-", "")}@exemplo.com`;
  for (const m of mudancas) {
    if (m.unidade === unidade && m.minuto + atrasoDaCopia <= minuto) email = m.email;
  }
  return email;
}

// Caminho 1: a cada aviso, pergunta o e-mail ao Cadastro. Se ele não responde, o
// aviso espera numa fila local e sai quando o Cadastro voltar.
function porConsulta() {
  let chamadas = 0;
  let erros = 0;
  let naHora = 0;
  let maiorAtraso = 0;
  const adiados: number[] = [];
  for (let aviso = 1; aviso <= cenario.avisos; aviso++) {
    const minuto = aviso;
    if (cadastroNoAr(minuto)) {
      for (const antigo of adiados.splice(0)) {
        chamadas += 1;
        maiorAtraso = Math.max(maiorAtraso, minuto - antigo);
      }
    }
    chamadas += 1;
    if (!cadastroNoAr(minuto)) {
      erros += 1;
      adiados.push(minuto);
      continue;
    }
    naHora += 1;
  }
  return [
    "Consulta ao Cadastro por API, a cada aviso",
    `  chamadas ao Cadastro: ${chamadas} (${erros} com erro)`,
    `  avisos enviados na hora: ${naHora}`,
    `  avisos adiados até o Cadastro voltar: ${erros} ` +
      `(o maior atraso: ${maiorAtraso} min)`,
    // Cada consulta lê o e-mail atual: nenhum aviso sai para um endereço antigo
    "  avisos para e-mail desatualizado: 0",
  ];
}

// Caminho 2: a Comunicação guarda uma cópia dos contatos, carregada uma vez e
// atualizada pelos eventos, que chegam alguns minutos depois da mudança
function porReplica() {
  const desatualizados: string[] = [];
  for (let aviso = 1; aviso <= cenario.avisos; aviso++) {
    const unidade = unidadeDo(aviso);
    const usado = emailEm(unidade, aviso, atraso);
    if (usado === emailEm(unidade, aviso)) continue;
    const m = mudancas.filter((x) => x.unidade === unidade && x.minuto <= aviso).pop()!;
    desatualizados.push(
      `    ${idDo(aviso)} para ${unidade}: e-mail antigo ` +
        `(mudou no minuto ${m.minuto}; a réplica, no ${m.minuto + atraso})`,
    );
  }
  const aplicados = mudancas.filter((m) => m.minuto + atraso <= cenario.avisos);
  return [
    `Réplica dos contatos, alimentada por eventos (atraso de ${atraso} min)`,
    `  carga inicial: ${cenario.unidades} contatos`,
    `  eventos ContatoAlterado aplicados: ${aplicados.length}`,
    "  chamadas ao Cadastro: 0",
    `  avisos enviados na hora: ${cenario.avisos}`,
    "  avisos adiados até o Cadastro voltar: 0",
    `  avisos para e-mail desatualizado: ${desatualizados.length}`,
    ...desatualizados,
  ];
}

fs.mkdirSync(path.join(saida, "contatos"), { recursive: true });
const linhas = [...porConsulta(), "", ...porReplica()];
fs.writeFileSync(
  path.join(saida, "contatos", "resultado.txt"),
  linhas.join("\n") + "\n",
);
console.log(`contatos: saída em ${saida}/contatos`);
