// O cliente que o monólito usa para falar com o serviço de Comunicação: o
// consumidor do contrato. Ele interpreta as respostas que o serviço promete dar.
export type Resultado = { ok: true; repetido: boolean } | { ok: false; erro: string };

export class ClienteComunicacao {
  readonly #url: string;

  constructor(url: string) {
    this.#url = url;
  }

  async avisar(id: string, texto: string): Promise<Resultado> {
    const resposta = await fetch(`${this.#url}/avisos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, texto }),
    });
    const corpo = await resposta.json();
    if (resposta.status === 200)
      return { ok: true, repetido: corpo.situacao === "repetido" };
    return { ok: false, erro: corpo.erro };
  }
}
