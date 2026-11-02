// Módulo de reservas. Etapa 3: nomes que dizem o que as coisas são e funções
// extraídas (Rename Variable, Extract Function). A estrutura ainda é a original.
import fs from "node:fs";

var aprovadas: any[] = [];
var log: string[] = [];

var smtp = {
  enviar(para: string, texto: string) {
    log.push("para " + para + ": " + texto);
  },
};

function diasAte(dataIso: string, hoje: Date): number {
  const inicioDeHoje = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  return Math.round((Date.parse(dataIso + "T00:00:00Z") - inicioDeHoje) / 86400000);
}

// O comentário original dizia "fim de semana", mas o código só olha o sábado
function ehSabado(dataIso: string): boolean {
  return new Date(dataIso + "T00:00:00Z").getUTCDay() == 6;
}

function valorDaReserva(espaco: any, pedido: any): number {
  var valor = espaco.taxa;
  if (ehSabado(pedido.data)) valor = valor + (valor * 20) / 100;
  if (pedido.convidados > 50) valor = valor + 5000;
  return valor;
}

function reais(centavos: number): string {
  return Math.floor(centavos / 100) + "," + String(centavos % 100).padStart(2, "0");
}

export function processarReservas(
  arquivo: string,
  pasta: string,
  hoje: Date = new Date(),
  correio = smtp,
) {
  var dados = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  var linhas: string[] = [];
  for (var pedido of dados.pedidos) {
    var unidade = dados.unidades.find((u: any) => u.id == pedido.unidade);
    var espaco = dados.espacos.find((e: any) => e.id == pedido.espaco);
    var aprovada = true;
    var motivo = "";
    if (unidade.emDebito) {
      aprovada = false;
      motivo = "débito";
    } else {
      if (diasAte(pedido.data, hoje) < 2) {
        aprovada = false;
        motivo = "antecedência";
      } else {
        for (var reserva of aprovadas) {
          if (reserva.espaco == pedido.espaco && reserva.data == pedido.data) {
            aprovada = false;
            motivo = "conflito";
          }
        }
      }
    }
    var inicio = `${pedido.id};${pedido.unidade};${pedido.espaco};${pedido.data}`;
    if (aprovada) {
      var valor = reais(valorDaReserva(espaco, pedido));
      aprovadas.push(pedido);
      linhas.push(`${inicio};aprovada;${valor}`);
      correio.enviar(
        unidade.email,
        `Reserva ${pedido.id} confirmada. Valor: R$ ${valor}`,
      );
    } else {
      linhas.push(`${inicio};recusada;${motivo}`);
      correio.enviar(unidade.email, `Reserva ${pedido.id} recusada (${motivo})`);
    }
  }
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(pasta + "/reservas.txt", linhas.join("\n") + "\n");
  fs.writeFileSync(pasta + "/emails.txt", log.join("\n") + "\n");
}

// Uso: node main.ts <entrada.json> <pasta-de-saída> [--hoje AAAA-MM-DD]
const [entrada, saida, opcao, data] = process.argv.slice(2);
const hoje = opcao === "--hoje" ? new Date(data + "T00:00:00Z") : new Date();
processarReservas(entrada, saida, hoje);
