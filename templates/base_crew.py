import os
from crewai import Agent, Task, Crew, Process


def get_manager_llm():
    return "gemini/gemini-2.5-flash"


def get_junior_llm():
    return "gemini/gemini-2.5-flash"


class BaseCrew:
    def __init__(self, project_name: str, department: str):
        self.project_name = project_name
        self.department = department
        # CrewAI usa GEMINI_API_KEY via LiteLLM
        os.environ.setdefault("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))

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
