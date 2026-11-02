<?php
// Modelo anêmico: só dados, todos públicos e alteráveis. Nenhuma regra mora aqui.
namespace Morada\Antes;

class Reserva
{
    public string $id = '';
    public string $unidade = '';
    public string $espaco = '';
    public string $data = '';
    public int $inicio = 0;
    public int $fim = 0;
    public string $situacao = 'confirmada';
    public int $taxaCentavos = 0;
}

// Os dados de todas as reservas, que qualquer parte do sistema pode ler e alterar
final class Reservas
{
    /** @var Reserva[] */
    public static array $todas = [];
}
