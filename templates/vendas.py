from crewai import Task, Crew, Process
from templates.base_crew import BaseCrew


class VendasCrew(BaseCrew):
    def __init__(self, project_name: str):
        super().__init__(project_name, "vendas")

    def run(self, task_description: str) -> str:
        manager = self._make_manager(
            role="Gerente de Vendas",
            goal=f"Maximizar as vendas e conversões do projeto {self.project_name}",
            backstory="Especialista em funil de vendas, fechamento e retenção de clientes.",
        )
        jr_closer = self._make_junior(
            role="Vendedor Jr",
            goal="Executar scripts de vendas e converter leads em clientes",
            backstory="Persuasivo, focado em superar objeções e fechar negócios.",
        )

        task_plan = Task(
            description=(
                f"Projeto: {self.project_name}. "
                f"Demanda: {task_description}. "
                f"Defina a abordagem de vendas mais eficaz."
            ),
            expected_output="Estratégia de vendas com scripts e objeções mapeadas.",
            agent=manager,
        )
        task_execute = Task(
            description=(
                f"Com base na estratégia do gerente, execute: {task_description}."
            ),
            expected_output="Material de vendas ou análise pronta para uso.",
            agent=jr_closer,
        )

        crew = Crew(
            agents=[manager, jr_closer],
            tasks=[task_plan, task_execute],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()
        return str(result)
