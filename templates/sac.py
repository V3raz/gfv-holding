from crewai import Task, Crew, Process
from templates.base_crew import BaseCrew


class SACCrew(BaseCrew):
    def __init__(self, project_name: str):
        super().__init__(project_name, "sac")

    def run(self, task_description: str) -> str:
        manager = self._make_manager(
            role="Gerente de SAC",
            goal=f"Garantir excelência no atendimento ao cliente do projeto {self.project_name}",
            backstory="Especialista em customer success e resolução de conflitos.",
        )
        jr_atendente = self._make_junior(
            role="Atendente Jr",
            goal="Resolver demandas de clientes com agilidade e empatia",
            backstory="Paciente, empático e orientado à resolução de problemas.",
        )

        task_plan = Task(
            description=(
                f"Projeto: {self.project_name}. "
                f"Demanda: {task_description}. "
                f"Defina o protocolo de atendimento adequado."
            ),
            expected_output="Protocolo de atendimento com scripts e fluxo de resolução.",
            agent=manager,
        )
        task_execute = Task(
            description=(
                f"Execute o atendimento ou produza o material para: {task_description}."
            ),
            expected_output="Resposta ou material de atendimento pronto.",
            agent=jr_atendente,
        )

        crew = Crew(
            agents=[manager, jr_atendente],
            tasks=[task_plan, task_execute],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()
        return str(result)
