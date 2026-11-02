// Teste de arquitetura com ArchUnit: as regras de fronteira entre os módulos.
// Uso: java morada.Arquitetura antes|depois   (sai com 1 se houver violação)
package morada;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import java.util.List;

public class Arquitetura {

    public static List<ArchRule> regras(String versao) {
        String modulos = "morada." + versao + ".modulos.";
        return List.of(
            noClasses()
                .that()
                .resideInAPackage(modulos + "reservas..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(modulos + "financeiro.interno..")
                .as("Reservas só usa a API pública do Financeiro"),
            noClasses()
                .that()
                .resideInAPackage(modulos + "financeiro..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage(modulos + "reservas..")
                .as("O Financeiro não depende de Reservas")
        );
    }

    public static void main(String[] args) {
        String versao = args[0];
        var classes = new ClassFileImporter().importPackages("morada." + versao);
        boolean violou = false;
        for (ArchRule regra : regras(versao)) {
            var resultado = regra.evaluate(classes);
            if (resultado.hasViolation()) {
                violou = true;
                System.out.println(resultado.getFailureReport());
            } else {
                System.out.println("OK: " + regra.getDescription());
            }
        }
        System.exit(violou ? 1 : 0);
    }
}
