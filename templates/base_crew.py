import os
from crewai import Agent, Task, Crew, Process


# ── Modelos ────────────────────────────────────────────────────────────────────
# Troque para "groq/llama-3.3-70b-versatile" se quiser usar Groq (free tier generoso)
# Troque para "gemini/gemini-1.5-flash" para quota maior no free tier do Gemini

def get_manager_llm():
    # Manager usa Gemini (raciocínio mais profundo, poucas chamadas)
    return os.getenv("MANAGER_LLM", "gemini/gemini-2.5-flash")


def get_junior_llm():
    # JRs usam Groq se disponível (grátis, 14.400 req/dia) — fallback para Gemini
    if os.getenv("GROQ_API_KEY"):
        return os.getenv("JUNIOR_LLM", "groq/llama-3.3-70b-versatile")
    return os.getenv("JUNIOR_LLM", "gemini/gemini-2.5-flash")


class BaseCrew:
    def __init__(self, project_name: str, department: str):
        self.project_name = project_name
        self.department = department
        # CrewAI usa GEMINI_API_KEY via LiteLLM
        os.environ.setdefault("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
        # AgentOps — monitoramento visual dos crews (ative adicionando AGENTOPS_API_KEY no .env)
        agentops_key = os.getenv("AGENTOPS_API_KEY")
        if agentops_key:
            try:
                import agentops
                agentops.init(agentops_key, default_tags=[project_name, department])
            except ImportError:
                pass  # agentops nao instalado, sem problema

    def _make_manager(self, role: str, goal: str, backstory: str) -> Agent:
        return Agent(
            role=role,
            goal=goal,
            backstory=backstory,
            llm=get_manager_llm(),
            verbose=False,
            allow_delegation=True,
        )

    def _make_junior(self, role: str, goal: str, backstory: str) -> Agent:
        return Agent(
            role=role,
            goal=goal,
            backstory=backstory,
            llm=get_junior_llm(),
            verbose=False,
            allow_delegation=False,
        )

    def run(self, task_description: str) -> str:
        raise NotImplementedError("Cada departamento deve implementar run()")
