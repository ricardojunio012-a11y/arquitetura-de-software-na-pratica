// O dispositivo da portaria: registra cada acesso numa fila local e só a esvazia quando
// o broker confirma o recebimento (QoS 1 do MQTT). Sem rede, os acessos esperam na
// fila; quando a rede volta, saem na ordem em que aconteceram. A fila fica num arquivo
// SQLite, para sobreviver a um reinício do dispositivo; com ":memory:", ela some junto
// com o processo, o que o laboratório usa para comparar.
import { DatabaseSync } from "node:sqlite";
import type { MqttClient } from "mqtt";

export interface Acesso {
  id: string; // único por dispositivo: é o que permite ao servidor ignorar repetições
  placa: string;
  momento: string;
}

export class FilaLocal {
  readonly #banco: DatabaseSync;

  constructor(arquivo = ":memory:") {
    this.#banco = new DatabaseSync(arquivo);
    this.#banco.exec(
      "CREATE TABLE IF NOT EXISTS pendentes " +
        "(seq INTEGER PRIMARY KEY AUTOINCREMENT, acesso TEXT NOT NULL)",
    );
  }

  // A gravação termina antes de registrar devolver: o acesso já está no disco
  registrar(acesso: Acesso) {
    this.#banco
      .prepare("INSERT INTO pendentes (acesso) VALUES (?)")
      .run(JSON.stringify(acesso));
  }

  get tamanho() {
    const linha = this.#banco.prepare("SELECT count(*) AS n FROM pendentes").get();
    return Number(linha!.n);
  }

  // Envia um por vez, em ordem, e só tira da fila o que o broker confirmou
  async esvaziar(cliente: MqttClient, topico: string) {
    const primeiro = this.#banco.prepare(
      "SELECT seq, acesso FROM pendentes ORDER BY seq LIMIT 1",
    );
    const apagar = this.#banco.prepare("DELETE FROM pendentes WHERE seq = ?");
    for (let p = primeiro.get(); p && cliente.connected; p = primeiro.get()) {
      await cliente.publishAsync(topico, String(p.acesso), { qos: 1 });
      apagar.run(p.seq);
    }
  }

  fechar() {
    this.#banco.close();
  }
}

// Do lado do servidor: guarda os identificadores já recebidos e ignora as repetições
export class Recebedor {
  readonly recebidos: Acesso[] = [];
  readonly #vistos = new Set<string>();
  repetidos = 0;

  receber(acesso: Acesso) {
    if (this.#vistos.has(acesso.id)) {
      this.repetidos++;
      return;
    }
    this.#vistos.add(acesso.id);
    this.recebidos.push(acesso);
  }
}
