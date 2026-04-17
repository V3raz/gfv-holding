import asyncio
import os
import tempfile
from dotenv import load_dotenv

load_dotenv()

import chainlit as cl
from core.jarvis_brain import JarvisBrain
from core.image_generator import ImageGenerator

# Palavras que indicam pedido de imagem
IMAGE_KEYWORDS = [
    "imagem", "foto", "banner", "logo", "criativo", "criativos",
    "ilustração", "ilustracao", "design", "poster", "flyer",
    "thumbnail", "wallpaper", "desenho", "arte", "visual",
    "infográfico", "infografico", "mockup", "capa",
]


def is_image_request(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in IMAGE_KEYWORDS)


@cl.on_chat_start
async def start():
    jarvis = JarvisBrain()
    image_gen = ImageGenerator(os.getenv("GOOGLE_API_KEY"))
    cl.user_session.set("jarvis", jarvis)
    cl.user_session.set("image_gen", image_gen)

    await cl.Message(
        content=(
            "## AGFV — Jarvis Online\n\n"
            "Olá, **Sr. Gustavo**. Estou operacional e à sua disposição.\n\n"
            "Posso ajudar com:\n"
            "- 💬 Conversas, dúvidas, estudos e análises\n"
            "- 🏢 Criação e gestão de projetos da AGFV\n"
            "- 🎨 Geração de imagens e criativos\n"
            "- 📋 Delegação de tarefas para os departamentos\n\n"
            "*Como posso ajudá-lo hoje?*"
        )
    ).send()


@cl.on_message
async def main(message: cl.Message):
    jarvis: JarvisBrain = cl.user_session.get("jarvis")
    image_gen: ImageGenerator = cl.user_session.get("image_gen")

    # Detecta pedido de imagem
    if is_image_request(message.content):
        thinking = cl.Message(content="🎨 Gerando imagem, aguarde...")
        await thinking.send()

        image_data, source = await asyncio.to_thread(
            image_gen.generate, message.content
        )

        if image_data:
            suffix = ".png"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                f.write(image_data)
                temp_path = f.name

            image_el = cl.Image(path=temp_path, name="resultado", display="inline")
            await cl.Message(
                content=f"✅ Imagem criada via **{source}**:",
                elements=[image_el],
            ).send()
        else:
            await cl.Message(
                content="❌ Não consegui gerar a imagem. Tente descrever com mais detalhes."
            ).send()

        await thinking.remove()
        return

    # Processamento normal pelo Jarvis
    thinking = cl.Message(content="")
    await thinking.send()

    response = await asyncio.to_thread(jarvis.process, message.content)

    thinking.content = response
    await thinking.update()
