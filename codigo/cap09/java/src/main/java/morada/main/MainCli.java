// Uso: java morada.main.MainCli <comando> [argumentos]   (repositório no PostgreSQL)
//      java morada.main.MainCli preparar-banco            (apaga e recria a tabela)
// Cada execução é um processo novo: o estado fica no banco, entre uma e outra.
package morada.main;

import morada.adaptadores.entrada.Cli;

public class MainCli {

    public static void main(String[] args) throws Exception {
        boolean preparar = args.length > 0 && args[0].equals("preparar-banco");
        var montado = Montar.montar("postgres", preparar);
        var resultado = preparar
            ? new Cli.Resultado("banco preparado", 0)
            : Cli.executar(montado.servico(), args);
        System.out.println(resultado.texto());
        System.exit(resultado.codigo());
    }
}
