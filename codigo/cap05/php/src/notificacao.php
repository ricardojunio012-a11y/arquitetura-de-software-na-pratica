<?php
// Strategy (os canais), Decorator (retentativas e registro) e Factory (a fábrica).
namespace Morada;

require_once __DIR__ . '/tipos.php';

final readonly class Mensagem
{
    public function __construct(public string $titulo, public string $texto) {}
}

interface Canal
{
    public function nome(): string;

    public function enviar(Morador $morador, Mensagem $mensagem): void;
}

// Falha que pode passar numa nova tentativa (provedor fora do ar, limite de uso)
final class ErroPassageiro extends \RuntimeException {}

// Falha que se repete em toda tentativa (endereço inexistente, número inválido)
final class ErroDefinitivo extends \RuntimeException {}

// Simula os provedores de e-mail, WhatsApp e SMS. Alguns destinos falham
// nas primeiras tentativas, como acontece com provedores de verdade, e
// outros são inválidos e falham sempre.
final class ProvedorSimulado
{
    /** @var string[] */
    public array $entregues = [];

    public function __construct(
        private array $falhas,
        private readonly array $invalidos = [],
    ) {}

    public function entregar(string $canal, string $destino, string $texto): void
    {
        if (in_array($destino, $this->invalidos, true)) {
            throw new ErroDefinitivo('destino inexistente');
        }
        if (($this->falhas[$destino] ?? 0) > 0) {
            $this->falhas[$destino]--;
            throw new ErroPassageiro('provedor indisponível');
        }
        $this->entregues[] = "$canal $destino | $texto";
    }
}

// Cada estratégia sabe o endereço e o formato do seu canal
final class Email implements Canal
{
    public function __construct(private readonly ProvedorSimulado $provedor) {}

    public function nome(): string
    {
        return 'email';
    }

    public function enviar(Morador $morador, Mensagem $m): void
    {
        $this->provedor->entregar(
            'email',
            $morador->email,
            "{$m->titulo}: {$m->texto}",
        );
    }
}

final class WhatsApp implements Canal
{
    public function __construct(private readonly ProvedorSimulado $provedor) {}

    public function nome(): string
    {
        return 'whatsapp';
    }

    public function enviar(Morador $morador, Mensagem $m): void
    {
        $texto = "*{$m->titulo}* {$m->texto}";
        $this->provedor->entregar('whatsapp', $morador->telefone, $texto);
    }
}

final class Sms implements Canal
{
    public function __construct(private readonly ProvedorSimulado $provedor) {}

    public function nome(): string
    {
        return 'sms';
    }

    // SMS é curto: só o título, e o detalhe fica no aplicativo
    public function enviar(Morador $morador, Mensagem $m): void
    {
        $this->provedor->entregar('sms', $morador->telefone, "Morada: {$m->titulo}");
    }
}

// Decorator: registra cada tentativa sem que o canal saiba que é observado
final class ComRegistro implements Canal
{
    public function __construct(
        private readonly Canal $canal,
        private array &$registro,
    ) {}

    public function nome(): string
    {
        return $this->canal->nome();
    }

    public function enviar(Morador $morador, Mensagem $mensagem): void
    {
        $quem = "{$this->nome()} para {$morador->nome}";
        try {
            $this->canal->enviar($morador, $mensagem);
            $this->registro[] = "$quem: entregue ({$mensagem->titulo})";
        } catch (\Throwable $erro) {
            $this->registro[] = "$quem: falhou ({$erro->getMessage()})";
            throw $erro;
        }
    }
}

// Decorator: tenta de novo antes de desistir, só quando a falha é passageira,
// e espera cada vez mais entre as tentativas (100 ms, 200 ms, 400 ms...).
// Quem espera é $esperar: em produção, um timer; no laboratório, um relógio
// simulado que só anota a espera, para a saída ser sempre a mesma.
final class ComRetentativas implements Canal
{
    /** @var callable(int, string): void */
    private $esperar;

    public function __construct(
        private readonly Canal $canal,
        private readonly int $tentativas,
        callable $esperar,
        private readonly int $esperaInicialMs = 100,
    ) {
        $this->esperar = $esperar;
    }

    public function nome(): string
    {
        return $this->canal->nome();
    }

    public function enviar(Morador $morador, Mensagem $mensagem): void
    {
        for ($tentativa = 1; ; $tentativa++) {
            try {
                $this->canal->enviar($morador, $mensagem);
                return;
            } catch (ErroPassageiro $erro) {
                if ($tentativa === $this->tentativas) {
                    throw new \RuntimeException(
                        "{$this->nome()} sem sucesso após $tentativa tentativas",
                    );
                }
                $espera = $this->esperaInicialMs * 2 ** ($tentativa - 1);
                ($this->esperar)($espera, "{$this->nome()} para {$morador->nome}");
            } catch (\Throwable $erro) {
                // Repetir uma falha definitiva só gasta tempo e cota do provedor
                throw new \RuntimeException(
                    "{$this->nome()} falhou sem nova tentativa ({$erro->getMessage()})",
                );
            }
        }
    }
}

// Factory: escolhe a estratégia pela preferência do morador e a embrulha nos
// decoradores. Quem envia avisos não conhece nenhuma classe concreta.
final class FabricaDeCanais
{
    /** @var array<string, Canal> */
    private array $canais = [];

    /** @var callable(int, string): void */
    private $esperar;

    public function __construct(
        ProvedorSimulado $provedor,
        private array &$registro,
        callable $esperar,
    ) {
        $this->esperar = $esperar;
        foreach (
            [new Email($provedor), new WhatsApp($provedor), new Sms($provedor)]
            as $c
        ) {
            $this->canais[$c->nome()] = $c;
        }
    }

    public function para(Morador $morador): Canal
    {
        $canal = $this->canais[$morador->canal] ?? $this->canais['email'];
        // A ordem importa: retentativas por fora, registro por dentro
        $comRegistro = new ComRegistro($canal, $this->registro);
        return new ComRetentativas($comRegistro, 3, $this->esperar);
    }
}
