"""
CrewLauncher — Interface do Jarvis para lançar crews de qualquer departamento.

Uso pelo Jarvis:
    launcher = CrewLauncher()
    result = launcher.launch(
        department="dev",
        project_name="lagom_gestao",
        task_brief="Adicione um módulo de Relatórios ao sistema POS"
    )
"""

import os
import importlib
from typing import Optional


# Mapeamento: departamento → (módulo, classe)
DEPARTMENT_MAP = {
    "dev":         ("templates.dev",         "DevCrew"),
    "marketing":   ("templates.marketing",   "MarketingCrew"),
    "comercial":   ("templates.comercial",   "ComercialCrew"),
    "vendas":      ("templates.vendas",      "VendasCrew"),
    "comunicacao": ("templates.comunicacao", "ComunicacaoCrew"),
    "sac":         ("templates.sac",         "SacCrew"),
    "financeiro":  ("templates.financeiro",  "FinanceiroCrew"),
}

# Pasta raiz dos projetos
BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_DIR  = os.path.join(BASE_DIR, "projects")


class CrewLauncher:
    """
    Ponto central para Jarvis delegar trabalho para os crews da AGFV.
    Suporta todos os departamentos. Retorna o resultado do crew como string.
    """

    def launch(
        self,
        department: str,
        project_name: str,
        task_brief: str,
    ) -> str:
        """
        Lança o crew de um departamento para executar uma tarefa em um projeto.

        Args:
            department:   Nome do departamento ('dev', 'marketing', etc.)
            project_name: Slug do projeto ('lagom_gestao', 'kora', etc.)
            task_brief:   Descrição completa da tarefa a executar

        Returns:
            Resultado/relatório do crew como string
        """
        # Valida departamento
        dept = department.lower().strip()
        if dept not in DEPARTMENT_MAP:
            available = ", ".join(sorted(DEPARTMENT_MAP.keys()))
            return (
                f"❌ Departamento '{department}' não existe.\n"
                f"Disponíveis: {available}"
            )

        # Valida projeto
        project_path = os.path.join(PROJECTS_DIR, project_name)
        if not os.path.isdir(project_path):
            return (
                f"❌ Projeto '{project_name}' não encontrado em {PROJECTS_DIR}.\n"
                f"Use 'criar projeto {project_name}' primeiro."
            )

        # Importa dinamicamente o módulo do departamento
        module_path, class_name = DEPARTMENT_MAP[dept]
        try:
            module = importlib.import_module(module_path)
            crew_class = getattr(module, class_name)
        except (ImportError, AttributeError) as e:
            return f"❌ Erro ao carregar crew '{dept}': {e}"

        # Instancia e executa o crew
        print(f"\n🚀 Lançando crew {dept.upper()} para o projeto '{project_name}'...")
        print(f"📋 Brief: {task_brief[:120]}{'...' if len(task_brief) > 120 else ''}\n")

        try:
            # DevCrew aceita project_path; os outros aceitam project_name
            if dept == "dev":
                crew_instance = crew_class(project_path=project_path)
            else:
                crew_instance = crew_class(
                    project_name=project_name,
                    department=dept
                )
            result = crew_instance.run(task_description=task_brief)
            return f"✅ Crew {dept.upper()} concluiu.\n\n{result}"
        except Exception as e:
            return f"❌ Erro durante execução do crew {dept.upper()}: {e}"

    def list_departments(self) -> str:
        """Retorna lista de departamentos disponíveis."""
        return "Departamentos disponíveis: " + ", ".join(sorted(DEPARTMENT_MAP.keys()))
