@echo off
echo ============================================
echo   AGFV - Instalando dependencias do Jarvis
echo ============================================
echo.

python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ============================================
echo   Configurando ambiente...
echo ============================================

if not exist .env (
    copy .env.example .env
    echo Arquivo .env criado. Abra-o e coloque sua GOOGLE_API_KEY.
) else (
    echo Arquivo .env ja existe.
)

echo.
echo ============================================
echo   Instalacao concluida!
echo   Proximo passo: edite o .env com sua chave
echo   Depois rode: python jarvis.py
echo ============================================
pause
