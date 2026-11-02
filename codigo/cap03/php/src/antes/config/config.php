<?php
// Configuração global: qualquer módulo lê e altera (acoplamento comum).
namespace Morada\Antes\Config;

final class Config
{
    public static int $fundoPorcento = 10;
    public static int $multaPorcento = 2;
    public static ?\DateTimeImmutable $hoje = null;
    public static array $dados = []; // o condomínio inteiro, preenchido pelo main
}
