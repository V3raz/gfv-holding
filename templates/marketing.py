from crewai import Task, Crew, Process
from templates.base_crew import BaseCrew


class MarketingCrew(BaseCrew):
    def __init__(self, project_name: str):
        super().__init__(project_name, "marketing")

    def run(self, task_description: str) -> str:
        manager = self._make_manager(
            role="Gerente de Marketing",
            goal=f"Planejar e supervisionar ações de marketing para o projeto {self.project_name}",
            backstory="Especialista em marketing digital com foco em resultados mensuráveis e crescimento de marca.",
        )
        jr_content = self._make_junior(
            role="Analista de Conteúdo",
            goal="Criar conteúdo relevante e engajante conforme orientação do gerente",
            backstory="Criativo, domina copywriting e redes sociais.",
        )
        jr_data = self._make_junior(
            role="Analista de Dados de Marketing",
            goal="Analisar métricas e propor melhorias baseadas em dados",
            backstory="Orientado a dados, transforma números em decisões acionáveis.",
        )

        task_plan = Task(
            description=(
                f"Projeto: {self.project_name}. "
                f"Demanda recebida: {task_description}. "
                f"Crie um plano de ação claro para a equipe executar."
            ),
            expected_output="Plano de ação com divisão de responsabilidades entre a equipe.",
            agent=manager,
        )
        task_execute = Task(
            description=(
                f"Com base no plano do gerente, execute a demanda: {task_description}. "
                f"Entregue o material final pronto para uso."
            ),
            expected_output="Entregável completo e pronto para publicação/uso.",
            agent=jr_content,
        )

        crew = Crew(
            agents=[manager, jr_content, jr_data],
            tasks=[task_plan, task_execute],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()
        return str(result)
