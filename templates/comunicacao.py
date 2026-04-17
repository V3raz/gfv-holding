from crewai import Task, Crew, Process
from templates.base_crew import BaseCrew


class ComunicacaoCrew(BaseCrew):
    def __init__(self, project_name: str):
        super().__init__(project_name, "comunicacao")

    def run(self, task_description: str) -> str:
        manager = self._make_manager(
            role="Gerente de Comunicação",
            goal=f"Gerenciar a comunicação interna e externa do projeto {self.project_name}",
            backstory="Especialista em comunicação corporativa, PR e gestão de reputação.",
        )
        jr_redator = self._make_junior(
            role="Redator Jr",
            goal="Produzir textos, comunicados e materiais de comunicação",
            backstory="Domina linguagem clara, objetiva e adaptada ao público-alvo.",
        )

        task_plan = Task(
            description=(
                f"Projeto: {self.project_name}. "
                f"Demanda: {task_description}. "
                f"Defina a estratégia de comunicação adequada."
            ),
            expected_output="Plano de comunicação com tom, canal e mensagem definidos.",
            agent=manager,
        )
        task_execute = Task(
            description=(
                f"Produza o material de comunicação para: {task_description}."
            ),
            expected_output="Texto ou comunicado pronto para publicação.",
            agent=jr_redator,
        )

        crew = Crew(
            agents=[manager, jr_redator],
            tasks=[task_plan, task_execute],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()
        return str(result)
