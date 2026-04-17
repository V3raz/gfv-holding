import os
from google import genai
from google.genai import types
from core.project_manager import ProjectManager

SYSTEM_PROMPT = """Você é Jarvis, o assistente pessoal e VP de operações da AGFV, empresa do Gustavo.

Sua personalidade:
- Profissional, direto e proativo (como o Jarvis do Homem de Ferro)
- Sempre chama o usuário de "Gustavo" ou "Sr. Gustavo"
- Reporta resultados de forma clara e objetiva
- Antecipa necessidades sempre que possível

Seu papel:
- Receber comandos do Gustavo em linguagem natural
- Gerenciar projetos da AGFV (criar, listar, atualizar)
- Delegar tarefas para os departamentos: Marketing, Comercial, Vendas, Comunicação, SAC, Financeiro
- Reportar o status de tudo que acontece na empresa

Seja conciso. Máximo 3-4 linhas por resposta, salvo quando detalhe for necessário."""


class JarvisBrain:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key or api_key == "sua_chave_aqui":
            raise ValueError("GOOGLE_API_KEY não encontrada no .env")

        self.client = genai.Client(api_key=api_key)
        self.project_manager = ProjectManager()
        self.chat = self.client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT
            )
        )

    def process(self, user_input: str) -> str:
        lower = user_input.lower()

        # Detecta intenção de criar projeto (qualquer combinação de cria/criar/novo + projeto)
        if "projeto" in lower and any(w in lower for w in ["criar", "cria", "crie", "novo", "nova", "abre", "abrir", "inicia", "iniciar", "começar", "começa"]):
            return self._criar_projeto(user_input)

        # Detecta intenção de listar projetos
        if any(w in lower for w in ["listar", "lista", "quais", "mostre", "mostra", "ver"]) and "projeto" in lower:
            return self._listar_projetos()

        # Detecta pedido de status geral
        if any(w in lower for w in ["status", "como está", "como estão", "relatório", "resumo"]):
            return self._status_geral()

        return self._conversa_geral(user_input)

    def _criar_projeto(self, user_input: str) -> str:
        # Usa chamada direta (sem contexto do chat) para extração limpa do nome
        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=(
                f"Extraia o nome do projeto desta frase: '{user_input}'. "
                f"Responda SOMENTE com o nome, sem pontuação, sem explicação, sem frases."
            )
        )
        raw_name = response.text.strip().split("\n")[0].strip().strip("'\"")
        project_name = raw_name.replace(" ", "_").lower()
        result = self.project_manager.create_project(project_name, raw_name)
        # Informa o chat sobre a criação para manter contexto
        self.chat.send_message(f"Projeto '{raw_name}' foi criado com sucesso.")
        return result

    def _listar_projetos(self) -> str:
        projects = self.project_manager.list_projects()
        if not projects:
            return "Nenhum projeto ativo ainda, Gustavo. Deseja criar um novo?"
        lista = "\n".join(f"  • {p}" for p in projects)
        return f"Projetos ativos da AGFV:\n{lista}"

    def _status_geral(self) -> str:
        projects = self.project_manager.list_projects()
        total = len(projects)
        if total == 0:
            return "AGFV operacional. Nenhum projeto ativo no momento."
        lista = ", ".join(projects)
        return f"AGFV operacional. {total} projeto(s) ativo(s): {lista}."

    def _conversa_geral(self, user_input: str) -> str:
        response = self.chat.send_message(user_input)
        return response.text
