"""
Ferramentas customizadas para os crews da AGFV.
Schemas simples e compatíveis com Groq (sem parâmetros opcionais sem default).
"""

from crewai.tools import tool


@tool("ler_arquivo")
def ler_arquivo(caminho: str) -> str:
    """
    Lê o conteúdo completo de um arquivo.
    Use o caminho absoluto do arquivo.
    Exemplo: C:/Users/Gustavo/Desktop/lagom-gestao/index.html
    """
    try:
        with open(caminho, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except FileNotFoundError:
        return f"ERRO: Arquivo não encontrado: {caminho}"
    except Exception as e:
        return f"ERRO ao ler arquivo: {e}"


@tool("escrever_arquivo")
def escrever_arquivo(caminho: str, conteudo: str) -> str:
    """
    Escreve (ou sobrescreve) um arquivo com o conteúdo fornecido.
    Cria diretórios intermediários se necessário.
    Use o caminho absoluto do arquivo.
    """
    import os
    try:
        os.makedirs(os.path.dirname(caminho), exist_ok=True)
        with open(caminho, "w", encoding="utf-8") as f:
            f.write(conteudo)
        return f"OK: Arquivo salvo em {caminho} ({len(conteudo)} chars)"
    except Exception as e:
        return f"ERRO ao escrever arquivo: {e}"


@tool("listar_arquivos")
def listar_arquivos(pasta: str) -> str:
    """
    Lista todos os arquivos de uma pasta recursivamente.
    Retorna os caminhos relativos à pasta informada.
    """
    import os
    try:
        resultado = []
        for root, dirs, files in os.walk(pasta):
            # Ignora pastas de sistema
            dirs[:] = [d for d in dirs if d not in (
                "node_modules", ".git", "__pycache__", ".vercel", "dist", "build"
            )]
            for file in files:
                full = os.path.join(root, file)
                rel = os.path.relpath(full, pasta)
                resultado.append(rel)
        return "\n".join(sorted(resultado)) if resultado else "Pasta vazia."
    except Exception as e:
        return f"ERRO ao listar arquivos: {e}"
