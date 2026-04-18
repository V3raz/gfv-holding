"""
Departamento DEV — Crew de Desenvolvimento de Software
Hierarquia: DEV Manager (Gemini Pro) → Frontend Jr + Backend Jr (Gemini Flash)
"""

import os
from crewai import Agent, Task, Crew, Process
from crewai_tools import FileWriterTool, FileReadTool, DirectoryReadTool
from templates.base_crew import BaseCrew, get_manager_llm, get_junior_llm


class DevCrew(BaseCrew):
    def __init__(self, project_path: str):
        # project_path: caminho absoluto da pasta do projeto (ex: .../projects/lagom_gestao)
        self.project_path = project_path
        project_name = os.path.basename(project_path)
        super().__init__(project_name=project_name, department="dev")

        # Ferramentas disponíveis para os agentes
        self.file_writer  = FileWriterTool()
        self.file_reader  = FileReadTool()
        self.dir_reader   = DirectoryReadTool(directory=project_path)

    def run(self, task_description: str) -> str:
        """
        Executa o crew de DEV com a descrição da tarefa.
        O Manager planeja, os Juniors implementam, o Manager revisa.
        """

        # ── AGENTES ──────────────────────────────────────────────────────────

        manager = Agent(
            role="DEV Manager",
            goal=(
                "Planejar e coordenar o desenvolvimento de software com qualidade,"
                " delegando tarefas precisas para os developers juniores."
            ),
            backstory=(
                "Você é um arquiteto de software sênior da AGFV. "
                "Analisa projetos existentes, planeja implementações de forma clara e objetiva, "
                "e garante que o código seja modular, limpo e funcional. "
                "Conhece Python, JavaScript vanilla, SQL, Supabase e boas práticas. "
                f"O projeto atual está em: {self.project_path}"
            ),
            llm=get_manager_llm(),
            allow_delegation=True,
            tools=[self.file_reader, self.dir_reader],
            verbose=False,
        )

        frontend_jr = Agent(
            role="Frontend Developer Junior",
            goal="Implementar interfaces web funcionais e bem estruturadas em HTML, CSS e JavaScript vanilla.",
            backstory=(
                "Você é um desenvolvedor frontend da AGFV especializado em HTML5, CSS3 e ES Modules. "
                "Escreve código limpo, comentado e sem frameworks pesados. "
                "Sabe trabalhar com Supabase JS client, fetch API e manipulação de DOM. "
                "Sempre salva os arquivos criados no caminho exato indicado pelo manager."
            ),
            llm=get_junior_llm(),
            allow_delegation=False,
            tools=[self.file_writer, self.file_reader],
            verbose=False,
        )

        backend_jr = Agent(
            role="Backend Developer Junior",
            goal="Implementar lógica de servidor, banco de dados, SQL e integrações de API com qualidade.",
            backstory=(
                "Você é um desenvolvedor backend da AGFV especializado em Python, SQL e APIs REST. "
                "Escreve código limpo, documentado e seguro. "
                "Conhece Supabase (PostgreSQL), FastAPI, python-dotenv e boas práticas de segurança. "
                "Sempre salva os arquivos criados no caminho exato indicado pelo manager."
            ),
            llm=get_junior_llm(),
            allow_delegation=False,
            tools=[self.file_writer, self.file_reader],
            verbose=False,
        )

        # ── TAREFAS ───────────────────────────────────────────────────────────

        task_planejar = Task(
            description=(
                f"Analise a estrutura atual do projeto em '{self.project_path}' "
                f"e elabore um plano de implementação detalhado para:\n\n"
                f"=== BRIEF DA TAREFA ===\n{task_description}\n=== FIM DO BRIEF ===\n\n"
                "O plano deve incluir:\n"
                "1. Lista de arquivos a criar ou modificar (com caminho completo)\n"
                "2. Descrição do que cada arquivo deve conter\n"
                "3. Quais partes são responsabilidade do Frontend Jr\n"
                "4. Quais partes são responsabilidade do Backend Jr\n"
                "5. Dependências e ordem de implementação\n\n"
                "Seja específico — os juniors só sabem o que você escrever aqui."
            ),
            expected_output=(
                "Plano de implementação estruturado com lista completa de arquivos "
                "e tarefas delegadas para Frontend Jr e Backend Jr."
            ),
            agent=manager,
        )

        task_frontend = Task(
            description=(
                "Implemente todos os componentes **frontend** conforme o plano do DEV Manager.\n\n"
                "Regras obrigatórias:\n"
                "- Use o FileWriterTool para salvar cada arquivo no caminho exato especificado\n"
                "- Código deve ser completo (sem '// TODO', sem placeholders)\n"
                "- Comentários em português no código\n"
                "- Verifique os arquivos existentes com FileReadTool antes de modificar\n"
                "- Confirme cada arquivo salvo no output final"
            ),
            expected_output=(
                "Lista de arquivos frontend criados/modificados com confirmação de cada um."
            ),
            agent=frontend_jr,
            context=[task_planejar],
        )

        task_backend = Task(
            description=(
                "Implemente todos os componentes **backend** conforme o plano do DEV Manager.\n\n"
                "Regras obrigatórias:\n"
                "- Use o FileWriterTool para salvar cada arquivo no caminho exato especificado\n"
                "- Código deve ser completo (sem '# TODO', sem placeholders)\n"
                "- Docstrings em português\n"
                "- Verifique os arquivos existentes com FileReadTool antes de modificar\n"
                "- Confirme cada arquivo salvo no output final"
            ),
            expected_output=(
                "Lista de arquivos backend criados/modificados com confirmação de cada um."
            ),
            agent=backend_jr,
            context=[task_planejar],
        )

        task_revisao = Task(
            description=(
                "Revise toda a implementação e produza o relatório final.\n\n"
                "1. Verifique com DirectoryReadTool se todos os arquivos planejados foram criados\n"
                "2. Leia arquivos críticos com FileReadTool para validar qualidade básica\n"
                "3. Liste todos os arquivos criados/modificados\n"
                "4. Aponte qualquer pendência ou problema identificado\n"
                "5. Confirme se o brief foi atendido\n\n"
                f"Brief original: {task_description}"
            ),
            expected_output=(
                "Relatório final: lista de arquivos implementados, status da implementação "
                "e pendências (se houver)."
            ),
            agent=manager,
            context=[task_planejar, task_frontend, task_backend],
        )

        # ── CREW ──────────────────────────────────────────────────────────────

        crew = Crew(
            agents=[manager, frontend_jr, backend_jr],
            tasks=[task_planejar, task_frontend, task_backend, task_revisao],
            process=Process.sequential,
            verbose=True,
        )

        result = crew.kickoff()
        return str(result)
