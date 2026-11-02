// Objeto de valor: um período de uso num dia. O fim nunca vem antes do início.
package morada.depois.dominio;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record Periodo(String data, int inicio, int fim) {
    public Periodo {
        if (fim <= inicio) {
            throw new ErroDeDominio(
                "período inválido: o fim deve ser depois do início"
            );
        }
    }

    public boolean sobrepoe(Periodo outro) {
        return data.equals(outro.data) && inicio < outro.fim && outro.inicio < fim;
    }

    public String mes() {
        return data.substring(0, 7);
    }

    public long diasDesde(String dia) {
        return ChronoUnit.DAYS.between(LocalDate.parse(dia), LocalDate.parse(data));
    }

    public boolean ehFimDeSemana() {
        DayOfWeek dia = LocalDate.parse(data).getDayOfWeek();
        return dia == DayOfWeek.SATURDAY || dia == DayOfWeek.SUNDAY;
    }

    @Override
    public String toString() {
        return data + " " + inicio + "h-" + fim + "h";
    }
}
