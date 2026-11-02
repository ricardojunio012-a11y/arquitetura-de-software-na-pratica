<?php
// O núcleo (microkernel): sabe emitir a remessa de cobranças, mas não conhece nenhum
// banco. Cada banco é um plugin que cumpre o contrato abaixo, descoberto numa pasta.
namespace Morada\Plugins;

final readonly class Cobranca
{
    public function __construct(
        public string $unidade,
        public int $valorCentavos,
        public string $banco,
    ) {}
}

// O contrato: tudo o que o núcleo sabe sobre um plugin
interface PluginDeBanco
{
    public function nome(): string;

    public function registrar(Cobranca $cobranca): string;
}

function reais(int $centavos): string
{
    return 'R$ ' . number_format($centavos / 100, 2, ',', '.');
}

final class Nucleo
{
    /** @var array<string, PluginDeBanco> */
    private array $plugins = [];

    public function instalar(mixed $plugin): void
    {
        if (!($plugin instanceof PluginDeBanco)) {
            throw new \InvalidArgumentException('plugin não cumpre o contrato');
        }
        $this->plugins[$plugin->nome()] = $plugin;
    }

    // Descoberta: cada arquivo da pasta é um plugin; nenhuma lista fixa no código
    public function carregar(string $pasta): void
    {
        $arquivos = glob("$pasta/*.php");
        sort($arquivos);
        foreach ($arquivos as $arquivo) {
            $this->instalar(require $arquivo);
        }
    }

    /** @return string[] */
    public function nomes(): array
    {
        $nomes = array_keys($this->plugins);
        sort($nomes);
        return $nomes;
    }

    // Um plugin ausente ou com defeito não derruba a remessa inteira
    public function emitir(Cobranca $c): string
    {
        $plugin = $this->plugins[$c->banco] ?? null;
        if ($plugin === null) {
            $resultado = "sem plugin para o banco {$c->banco}";
        } else {
            try {
                $resultado = $plugin->registrar($c);
            } catch (\Throwable $erro) {
                $resultado = "falha no plugin {$plugin->nome()}: {$erro->getMessage()}";
            }
        }
        return "{$c->unidade};" . reais($c->valorCentavos) . ";{$c->banco};$resultado";
    }
}
