// Autorização em duas camadas: o papel (RBAC), que vem no token, e a relação com
// o objeto (ReBAC), que vem dos dados do Morada.
import type { Boleto } from "./dados.ts";

export interface Usuario {
  id: string; // "sub" do token, ou "cliente:<client_id>" numa conta de serviço
  papeis: string[];
}

// RBAC: que papéis podem usar a função "ler boletos", em qualquer condomínio
const PAPEIS_QUE_LEEM_BOLETOS = ["morador", "sindico", "administradora"];

export function papelPermite(usuario: Usuario): boolean {
  return usuario.papeis.some((p) => PAPEIS_QUE_LEEM_BOLETOS.includes(p));
}

// ReBAC: um mini-Zanzibar. "tem" responde se o usuário tem a relação com o
// objeto, direta ou por meio de um conjunto (objeto#relação) que o contém.
export class Relacoes {
  private readonly porObjeto = new Map<string, string[]>();

  constructor(tuplas: string[]) {
    for (const t of tuplas) {
      const [objetoRelacao, sujeito] = t.split("@");
      const lista = this.porObjeto.get(objetoRelacao) ?? [];
      lista.push(sujeito);
      this.porObjeto.set(objetoRelacao, lista);
    }
  }

  tem(objeto: string, relacao: string, usuario: string, prof = 0): boolean {
    if (prof > 5) return false; // um limite contra ciclos nas relações
    for (const sujeito of this.porObjeto.get(`${objeto}#${relacao}`) ?? []) {
      if (sujeito === usuario) return true;
      if (sujeito.includes("#")) {
        const [obj, rel] = sujeito.split("#");
        if (this.tem(obj, rel, usuario, prof + 1)) return true;
      }
    }
    return false;
  }

  // A regra do objeto "boleto": quem mora na unidade, o síndico do condomínio
  // e os membros da administradora do condomínio
  podeLerBoleto(usuario: Usuario, b: Boleto): boolean {
    const u = usuario.id;
    return (
      this.tem(`unidade:${b.unidade}`, "morador", u) ||
      this.tem(`condominio:${b.condominio}`, "sindico", u) ||
      this.tem(`condominio:${b.condominio}`, "administradora", u)
    );
  }
}
