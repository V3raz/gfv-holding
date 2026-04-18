import os
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")

DEPARTMENTS = ["marketing", "comercial", "vendas", "comunicacao", "sac", "financeiro"]


class ProjectManager:
    def __init__(self):
        os.makedirs(PROJECTS_DIR, exist_ok=True)

    def create_project(self, slug: str, display_name: str = None) -> str:
        project_path = os.path.join(PROJECTS_DIR, slug)

        if os.path.exists(project_path):
            return f"Projeto '{display_name or slug}' já existe, Gustavo."

        os.makedirs(project_path)
        for dept in DEPARTMENTS:
            os.makedirs(os.path.join(project_path, dept))

        config = {
            "slug": slug,
            "name": display_name or slug,
            "created_at": datetime.now().isoformat(),
            "departments": DEPARTMENTS,
            "status": "active",
            "tasks": []
        }

        with open(os.path.join(project_path, "config.json"), "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        depts = ", ".join(d.capitalize() for d in DEPARTMENTS)
        return (
            f"Projeto '{display_name or slug}' criado com sucesso, Gustavo.\n"
            f"Departamentos inicializados: {depts}.\n"
            f"Localização: projects/{slug}/"
        )

    def list_projects(self) -> list:
        if not os.path.exists(PROJECTS_DIR):
            return []
        result = []
        for d in os.listdir(PROJECTS_DIR):
            config_path = os.path.join(PROJECTS_DIR, d, "config.json")
            if os.path.isdir(os.path.join(PROJECTS_DIR, d)) and os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    config = json.load(f)
                result.append(config.get("name", d))
        return result

    def get_project(self, slug: str) -> dict | None:
        config_path = os.path.join(PROJECTS_DIR, slug, "config.json")
        if not os.path.exists(config_path):
            return None
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_project_path(self, slug: str) -> str | None:
        """Retorna o caminho absoluto da pasta do projeto, ou None se não existir."""
        path = os.path.join(PROJECTS_DIR, slug)
        return path if os.path.isdir(path) else None

    def add_task(self, slug: str, department: str, description: str) -> bool:
        config_path = os.path.join(PROJECTS_DIR, slug, "config.json")
        if not os.path.exists(config_path):
            return False
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        config["tasks"].append({
            "department": department,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "status": "pending"
        })
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
