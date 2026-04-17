import os
import urllib.parse
import requests
from google import genai
from google.genai import types


class ImageGenerator:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    def generate_gemini(self, prompt: str) -> bytes | None:
        try:
            response = self.client.models.generate_images(
                model="imagen-3.0-generate-002",
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                ),
            )
            return response.generated_images[0].image.image_bytes
        except Exception:
            return None

    def generate_pollinations(self, prompt: str) -> bytes | None:
        try:
            encoded = urllib.parse.quote(prompt)
            url = (
                f"https://image.pollinations.ai/prompt/{encoded}"
                f"?width=1024&height=1024&nologo=true&enhance=true&model=flux"
            )
            r = requests.get(url, timeout=90)
            if r.status_code == 200 and r.headers.get("content-type", "").startswith("image"):
                return r.content
            return None
        except Exception:
            return None

    def generate(self, prompt: str) -> tuple[bytes | None, str]:
        # Tenta Gemini Imagen primeiro
        data = self.generate_gemini(prompt)
        if data:
            return data, "Gemini Imagen"
        # Fallback para Pollinations.ai
        data = self.generate_pollinations(prompt)
        if data:
            return data, "Pollinations.ai"
        return None, "none"
