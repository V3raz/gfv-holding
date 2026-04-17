from crewai import Task, Crew, Process
from templates.base_crew import BaseCrew


class ComercialCrew(BaseCrew):
    def __init__(self, project_name: str):
        super().__init__(project_name, "comercial")

    def run(self, task_description: str) -> str:
        manager = self._make_manager(
            role="Gerente Comercial",
            goal=f"Desenvolver estratégias comerciais e parcerias para o projeto {self.project_name}",
            backstory="Experiente em negociação B2B e desenvolvimento de negócios.",
        )
        jr_prospecção = self._make_junior(
            role="Analista Comercial Jr",
            goal="Prospectar clientes e parceiros conforme estratégia do gerente",
            backstory="Focado em prospecção ativa e qualificação de leads.",
        )

        task_plan = Task(
            description=(
                f"Projeto: {self.project_name}. "
                f"Demanda: {task_description}. "
                f"Desenvolva a estratégia comercial adequada."
            ),
            expected_output="Estratégia comercial com próximos passos definidos.",
            agent=manager,
        )
        task_execute = Task(
            description=(
                f"Execute a estratégia do gerente para: {task_description}. "
                f"Gere o material ou análise solicitada."
            ),
            expected_output="Entregável comercial completo.",
            agent=jr_prospecção,
        )

        crew = Crew(
            agents=[manager, jr_prospecção],
            tasks=[task_plan, task_execute],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()
        return str(result)
