"""
JarvisBrain — Núcleo de inteligência do Jarvis (VP da AGFV).

Hierarquia de decisão:
  1. Tarefas de desenvolvimento  → delega para DEV crew (Manager + Juniors)
  2. Tarefas de marketing/vendas → delega para o crew do departamento correto
  3. Gerenciamento de projetos   → ProjectManager local
  4. Conversa geral / perguntas  → Gemini chat direto (Jarvis responde)

Jarvis só usa tokens para: orquestrar, decidir, revisar e conversar.
O trabalho pesado (código, conteúdo, análise) vai para os crews.
"""

import os
import re
from google import genai
from google.genai import types
from core.project_manager import ProjectManager
from core.crew_launcher import CrewLauncher

# ── Sistema Prompt do Jarvis ──────────────────────────────────────────────────

SYSTEM_PROMPT = """Você é Jarvis, VP de Operações e assistente pessoal do Gustavo na AGFV.

Personalidade:
- Direto, profissional e proativo (estilo Jarvis do Homem de Ferro)
- Chama o usuário de "Gustavo" ou "Sr. Gustavo"
- Reporta resultados de forma objetiva e concisa
- Quando delega para um crew, informa claramente o que foi delegado

Seu papel:
- Orquestrar os crews de cada departamento (DEV, Marketing, Vendas, etc.)
- Gerenciar projetos da AGFV
- Responder perguntas e auxiliar o Gustavo no dia-a-dia
- Fazer curadoria do trabalho dos crews — você revisa, não executa

Regra de ouro: Máximo 4 linhas por resposta, salvo quando relatório for necessário."""

# ── Keywords por departamento ─────────────────────────────────────────────────

# Palavras de ação que indicam "fazer algo"
ACAO = ["crie", "cria", "criar", "faça", "faz", "fazer", "desenvolva", "desenvolver",
        "construa", "construir", "implemente", "implementar", "adicione", "adicionar",
        "monte", "montar", "programe", "programar", "codifique", "codificar",
        "escreva", "escrever", "gere", "gerar", "produza", "produzir",
        "atualize", "atualizar", "corrija", "corrigir", "conserte", "consertar",
        "refatore", "refatorar", "melhore", "melhorar", "otimize", "otimizar"]

# Keywords de domínio por departamento
DEPT_KEYWORDS = {
    "dev": [
        "código", "função", "tela", "página", "componente", "módulo", "api",
        "banco", "sql", "tabela", "backend", "frontend", "sistema", "feature",
        "bug", "erro", "deploy", "html", "css", "javascript", "js", "python",
        "supabase", "endpoint", "rota", "dashboard", "formulário", "botão",
        "relatório", "integração", "script"
    ],
    "marketing": [
        "post", "campanha", "anúncio", "anuncio", "criativo", "banner",
        "instagram", "facebook", "tiktok", "redes sociais", "conteúdo",
        "engajamento", "hashtag", "copy", "legenda"
    ],
    "vendas": [
        "proposta", "pitch", "apresentação", "lead", "cliente", "venda",
        "negociação", "follow-up", "pipeline", "crm", "oportunidade"
    ],
    "financeiro": [
        "fluxo de caixa", "orçamento", "despesa", "receita", "dre",
        "balanço", "fatura", "cobrança", "financeiro", "custo"
    ],
    "marketing_content": [
        "texto", "artigo", "blog", "email marketing", "newsletter",
        "roteiro", "script de venda", "descrição de produto"
    ],
}


class JarvisBrain:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key or api_key == "sua_chave_aqui":
            raise ValueError("GOOGLE_API_KEY não encontrada no .env")

        self.client = genai.Client(api_key=api_key)
        self.project_manager = ProjectManager()
        self.crew_launcher = CrewLauncher()

        # Chat com histórico (para conversas gerais)
        self.chat = self.client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT
            )
        )

    # ── Roteador principal ────────────────────────────────────────────────────

    def process(self, user_input: str) -> str:
        lower = user_input.lower()

        # 1. Criar projeto
        if "projeto" in lower and any(w in lower for w in
                ["criar", "cria", "crie", "novo", "nova", "abrir", "abre",
                 "iniciar", "inicia", "começar", "começa"]):
            return self._criar_projeto(user_input)

        # 2. Listar projetos
        if any(w in lower for w in ["listar", "lista", "quais", "mostre", "ver"]) \
                and "projeto" in lower:
            return self._listar_projetos()

        # 3. Status geral
        if any(w in lower for w in ["status", "como está", "como estão",
                                     "relatório", "resumo"]) \
                and any(w in lower for w in ["empresa", "agfv", "projeto", "tudo"]):
            return self._status_geral()

        # 4. Delegação para crew DEV (tarefa de desenvolvimento)
        if self._e_tarefa_dev(lower):
            return self._delegar_crew(user_input, lower, "dev")

        # 5. Delegação para marketing
        if self._e_tarefa_dept(lower, "marketing") or self._e_tarefa_dept(lower, "marketing_content"):
            return self._delegar_crew(user_input, lower, "marketing")

        # 6. Delegação para vendas
        if self._e_tarefa_dept(lower, "vendas"):
            return self._delegar_crew(user_input, lower, "vendas")

        # 7. Delegação para financeiro
        if self._e_tarefa_dept(lower, "financeiro"):
            return self._delegar_crew(user_input, lower, "financeiro")

        # 8. Conversa geral / perguntas
        return self._conversa_geral(user_input)

    # ── Detecção de intenção ──────────────────────────────────────────────────

    def _e_tarefa_dev(self, lower: str) -> bool:
        """Detecta se é uma tarefa de desenvolvimento."""
        tem_acao = any(w in lower for w in ACAO)
        tem_dominio_dev = any(w in lower for w in DEPT_KEYWORDS["dev"])
        return tem_acao and tem_dominio_dev

    def _e_tarefa_dept(self, lower: str, dept: str) -> bool:
        """Detecta se é uma tarefa de um departamento específico."""
        tem_acao = any(w in lower for w in ACAO)
        tem_dominio = any(w in lower for w in DEPT_KEYWORDS.get(dept, []))
        return tem_acao and tem_dominio

    # ── Delegação para crews ──────────────────────────────────────────────────

    def _delegar_crew(self, user_input: str, lower: str, department: str) -> str:
        """
        Identifica o projeto alvo, prepara o brief e lança o crew.
        Se não conseguir identificar o projeto, usa o primeiro projeto ativo.
        """
        # Tenta identificar o projeto mencionado
        project_name = self._extrair_projeto_alvo(lower)

        if not project_name:
            # Usa o primeiro projeto ativo como padrão
            projects = self.project_manager.list_projects()
            if projects:
                # list_projects retorna display names — converte para slug
                project_name = projects[0].replace(" ", "_").lower()
            else:
                return (
                    "Não há projetos ativos, Gustavo. "
                    "Crie um projeto primeiro com 'criar projeto [nome]'."
                )

        # Enriquece o brief com contexto
        brief = self._enriquecer_brief(user_input, project_name, department)

        # Informa ao Gustavo que está delegando
        print(f"\n🤖 Jarvis → Delegando para crew {department.upper()} | Projeto: {project_name}\n")

        # Lança o crew (bloqueante — retorna quando concluir)
        resultado = self.crew_launcher.launch(
            department=department,
            project_name=project_name,
            task_brief=brief,
        )

        # Salva no log de memória do projeto
        self._salvar_log(project_name, department, user_input, resultado)

        # Jarvis faz curadoria do resultado antes de responder
        curadoria = self._curar_resultado(resultado, user_input)
        return curadoria

    def _extrair_projeto_alvo(self, lower: str) -> str | None:
        """Tenta extrair o nome do projeto da mensagem."""
        projects = self.project_manager.list_projects()
        for p in projects:
            slug = p.replace(" ", "_").lower()
            if slug in lower or p.lower() in lower:
                return slug
        return None

    def _enriquecer_brief(self, user_input: str, project_name: str, department: str) -> str:
        """Adiciona contexto do projeto ao brief antes de enviar ao crew."""
        project_path = self.project_manager.get_project_path(project_name)
        briefing_path = os.path.join(project_path, "memory", "briefing.md") if project_path else None

        contexto = ""
        if briefing_path and os.path.exists(briefing_path):
            with open(briefing_path, "r", encoding="utf-8") as f:
                contexto = f"\n\n=== CONTEXTO DO PROJETO ===\n" + f.read() + "\n=== FIM DO CONTEXTO ==="

        return f"{user_input}{contexto}"

    def _curar_resultado(self, resultado: str, pedido_original: str) -> str:
        """
        Jarvis revisa o resultado do crew e produz uma resposta concisa para o Gustavo.
        Isso é a 'curadoria' — Jarvis não reescreve o trabalho, apenas avalia.
        """
        prompt = (
            f"O pedido do Gustavo era: '{pedido_original}'\n\n"
            f"O crew retornou:\n{resultado[:2000]}\n\n"
            "Produza uma resposta CURTA (máximo 5 linhas) informando:\n"
            "1. O que foi feito\n"
            "2. Status (concluído / pendências)\n"
            "3. Próximos passos (se houver)\n"
            "Responda como Jarvis — profissional e direto."
        )
        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text.strip()

    def _salvar_log(self, project_name: str, department: str,
                    tarefa: str, resultado: str) -> None:
        """Registra a tarefa e resultado no log de memória do projeto."""
        try:
            project_path = self.project_manager.get_project_path(project_name)
            if not project_path:
                return
            log_path = os.path.join(project_path, "memory", "jarvis_log.md")
            os.makedirs(os.path.dirname(log_path), exist_ok=True)
            from datetime import date
            entry = (
                f"\n## {date.today()} — Crew {department.upper()}\n"
                f"**Tarefa:** {tarefa[:200]}\n"
                f"**Resultado:** {resultado[:400]}\n"
            )
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception:
            pass  # Log é opcional — não quebra o fluxo principal

    # ── Métodos de gerenciamento ──────────────────────────────────────────────

    def _criar_projeto(self, user_input: str) -> str:
        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=(
                f"Extraia o nome do projeto desta frase: '{user_input}'. "
                "Responda SOMENTE com o nome, sem pontuação, sem explicação."
            )
        )
        raw_name = response.text.strip().split("\n")[0].strip().strip("'\"")
        project_name = raw_name.replace(" ", "_").lower()
        result = self.project_manager.create_project(project_name, raw_name)
        self.chat.send_message(f"Projeto '{raw_name}' criado com sucesso.")
        return result

    def _listar_projetos(self) -> str:
        projects = self.project_manager.list_projects()
        if not projects:
            return "Nenhum projeto ativo ainda, Gustavo. Deseja criar um?"
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
