from crewai import Task, Crew, Process
from templates.base_crew import BaseCrew


class FinanceiroCrew(BaseCrew):
    def __init__(self, project_name: str):
        super().__init__(project_name, "financeiro")

    def run(self, task_description: str) -> str:
        manager = self._make_manager(
            role="Gerente Financeiro",
            goal=f"Controlar e otimizar as finanças do projeto {self.project_name}",
            backstory="CFO experiente, especialista em fluxo de caixa, custos e rentabilidade.",
        )
        jr_analista = self._make_junior(
            role="Analista Financeiro Jr",
            goal="Executar análises financeiras e gerar relatórios",
            backstory="Detalhista, domina planilhas, DRE e análise de viabilidade.",
        )

        task_plan = Task(
            description=(
                f"Projeto: {self.project_name}. "
                f"Demanda: {task_description}. "
                f"Defina a abordagem financeira adequada."
            ),
            expected_output="Plano financeiro com métricas e critérios de análise definidos.",
            agent=manager,
        )
        task_execute = Task(
            description=(
                f"Execute a análise ou produza o relatório para: {task_description}."
            ),
            expected_output="Análise financeira ou relatório completo.",
            agent=jr_analista,
        )

        crew = Crew(
            agents=[manager, jr_analista],
            tasks=[task_plan, task_execute],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()
        return str(result)
