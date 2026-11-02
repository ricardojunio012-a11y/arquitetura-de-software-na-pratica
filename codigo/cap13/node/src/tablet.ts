// O app do porteiro, no tablet. Sem internet, guarda as operações numa fila local e
// segue trabalhando; ao reconectar, envia a fila ao BFF e mostra os conflitos.
import type { BffPorteiro, Operacao } from "./bff.ts";

export class Tablet {
  readonly #nome: string;
  readonly #conectar: () => BffPorteiro;
  readonly #registro: string[];
  readonly #versoes = new Map<string, number>();
  readonly #fila: Operacao[] = [];
  #online = true;
  #contador = 0;

  constructor(nome: string, conectar: () => BffPorteiro, registro: string[]) {
    this.#nome = nome;
    this.#conectar = conectar;
    this.#registro = registro;
  }

  // O tablet fala com o endereço do BFF, seja qual for o processo que o atende
  get #bff() {
    return this.#conectar();
  }

  #log(texto: string) {
    this.#registro.push(`tablet ${this.#nome} ${texto}`);
  }

  abrir() {
    const tela = this.#bff.inicio();
    for (const e of tela.encomendasPendentes) this.#versoes.set(e.encomenda, e.versao);
    const pendentes = tela.encomendasPendentes.map((e) => e.encomenda).join(", ");
    const esperados = tela.visitantesEsperados.map((v) => v.nome).join(", ");
    this.#log(`abriu: encomendas [${pendentes}], visitantes esperados [${esperados}]`);
  }

  desconectar() {
    this.#online = false;
    this.#log("perdeu a internet");
  }

  operar(op: Omit<Operacao, "id" | "versaoVista">) {
    this.#contador += 1;
    const completa: Operacao = { ...op, id: `op-${this.#nome}${this.#contador}` };
    if (op.encomenda) completa.versaoVista = this.#versoes.get(op.encomenda);
    if (!this.#online) {
      this.#fila.push(completa);
      this.#log(`guardou ${this.#descrever(completa)} na fila local`);
      return;
    }
    const [[, resultado]] = this.#bff.sincronizar(this.#nome, [completa]);
    this.#log(`enviou ${this.#descrever(completa)}: ${resultado}`);
  }

  // Ao reconectar, a fila vai em lote, e a resposta pode se perder no caminho
  reconectar(perderResposta: boolean) {
    this.#online = true;
    const resultados = this.#bff.sincronizar(this.#nome, this.#fila);
    if (perderResposta) {
      const n = this.#fila.length;
      this.#log(`voltou e enviou ${n} operações; a resposta se perdeu`);
      return;
    }
    this.#mostrar("enviou", resultados);
  }

  // Sem resposta, o tablet não sabe o que foi aplicado: reenvia o mesmo lote
  reenviar() {
    this.#mostrar("reenviou", this.#bff.sincronizar(this.#nome, this.#fila));
  }

  #mostrar(verbo: string, resultados: [Operacao, string][]) {
    this.#log(`${verbo} ${this.#fila.length} operações:`);
    for (const [op, resultado] of resultados) {
      this.#registro.push(`  ${this.#descrever(op)}: ${resultado}`);
    }
    this.#fila.length = 0;
  }

  #descrever(op: Operacao) {
    const alvo = op.encomenda ?? op.nome;
    return `${op.id} (${op.tipo} ${alvo})`;
  }
}
