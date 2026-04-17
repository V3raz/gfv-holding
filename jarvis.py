import os
import sys
from dotenv import load_dotenv

load_dotenv()

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    USE_RICH = True
except ImportError:
    USE_RICH = False

from core.jarvis_brain import JarvisBrain

console = Console() if USE_RICH else None


def print_banner():
    if USE_RICH:
        banner = Text("AGFV — JARVIS ONLINE", style="bold cyan", justify="center")
        console.print(Panel(banner, subtitle="Sistema de Gestão de Equipes IA", border_style="cyan"))
    else:
        print("=" * 50)
        print("       AGFV — JARVIS ONLINE")
        print("=" * 50)


def print_jarvis(text: str):
    if USE_RICH:
        console.print(f"\n[bold cyan]Jarvis:[/bold cyan] {text}\n")
    else:
        print(f"\nJarvis: {text}\n")


def print_gustavo_prompt():
    if USE_RICH:
        return console.input("[bold yellow]Gustavo:[/bold yellow] ")
    else:
        return input("Gustavo: ")


def main():
    print_banner()

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "sua_chave_aqui":
        print_jarvis(
            "GOOGLE_API_KEY não configurada.\n"
            "Abra o arquivo .env e coloque sua chave do Google AI Studio.\n"
            "Depois rode: python jarvis.py"
        )
        sys.exit(1)

    try:
        jarvis = JarvisBrain()
    except Exception as e:
        print_jarvis(f"Erro ao inicializar: {e}")
        sys.exit(1)

    print_jarvis(
        "Olá, Gustavo. Jarvis online e pronto para operar.\n"
        "Você pode me pedir para:\n"
        "  • Criar um novo projeto (ex: 'cria o projeto Kora')\n"
        "  • Listar projetos ativos\n"
        "  • Delegar tarefas para um departamento\n"
        "  • Qualquer pergunta ou análise\n"
        "  • Digite 'sair' para encerrar."
    )

    while True:
        try:
            user_input = print_gustavo_prompt().strip()

            if not user_input:
                continue

            if user_input.lower() in ["sair", "exit", "quit", "encerrar"]:
                print_jarvis("Encerrando sistemas. Até logo, Gustavo.")
                break

            response = jarvis.process(user_input)
            print_jarvis(response)

        except KeyboardInterrupt:
            print_jarvis("\nSistemas encerrados. Até logo, Gustavo.")
            break
        except Exception as e:
            print_jarvis(f"Erro inesperado: {e}")


if __name__ == "__main__":
    main()
