# Jarvis Pessoal — Google Apps Script

Assistente diário rodando 100% na nuvem do Google (sem servidor, sem custo).
Integra **Calendar + Gmail + Telegram + Gemini**.

---

## 1. Criar o bot do Telegram

1. No Telegram, fale com **@BotFather** → `/newbot` → escolha nome.
2. Copie o **token** (`123456:ABC...`).
3. Inicie uma conversa com seu bot (mande qualquer mensagem).
4. Abra no navegador:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Procure `"chat":{"id":XXXXXX` → esse número é seu **chat_id**.

## 2. Pegar a Gemini API Key

1. Acesse https://aistudio.google.com/apikey
2. "Create API key" → copie.

## 3. Criar o projeto no Apps Script

1. Vá em https://script.google.com → **Novo projeto**.
2. Renomeie pra `Jarvis Pessoal`.
3. No arquivo `Código.gs`, **apague tudo** e cole o conteúdo de `Codigo.gs`.
4. Clique em ⚙️ **Configurações do projeto** → marque
   *"Mostrar arquivo de manifesto appsscript.json no editor"*.
5. Volte ao editor, abra `appsscript.json` e cole o conteúdo do arquivo aqui do mesmo nome.

## 4. Cadastrar as 3 chaves

No editor → ⚙️ **Configurações do projeto** → role até **Propriedades do script** →
**Adicionar propriedade do script** (3 vezes):

| Propriedade        | Valor                          |
|--------------------|--------------------------------|
| `TELEGRAM_TOKEN`   | token do BotFather             |
| `TELEGRAM_CHAT_ID` | seu chat_id numérico           |
| `GEMINI_API_KEY`   | chave do AI Studio             |

Salve.

## 5. Autorizar e instalar gatilhos

1. No editor, selecione a função `testar` no dropdown do topo → ▶ **Executar**.
2. Vai pedir permissões → autorize sua conta Google
   (vai aparecer "App não verificado" → *Avançado* → *Acessar Jarvis Pessoal*).
3. Confira o Telegram: deve chegar `🤖 Teste: Telegram OK.`
4. Agora selecione `instalarGatilhos` → ▶ **Executar**.
5. Pronto. Você vai receber `✅ Jarvis ativado` no Telegram.

## 6. Agenda dos lembretes (seg–sex)

| Hora   | O que acontece                                              |
|--------|-------------------------------------------------------------|
| 07:40  | Bom dia + agenda do dia + análise Gemini do Gmail           |
| 08:50  | Aviso bloco foco + pergunta provocativa do Gemini           |
| 11:00  | Checagem leve se você sumiu por 2h+                         |
| 13:20  | Lembrete da Alice                                           |
| 15:20  | Aviso academia                                              |
| 16:40  | Bloco estágio                                               |
| 18:30  | Resumo motivacional + aviso da aula                         |
| 23:00  | Fim de noite (todos os dias, inclusive fds)                 |

Final de semana: só roda o `fimDeNoite`.

---

## Como adicionar lembretes novos

Abra `Codigo.gs`, vá no fim do arquivo, em `instalarGatilhos()`:

```javascript
const _criar = (funcao, hora, minuto) => { ... };

_criar('bomDia', 7, 40);
// adicione aqui:
_criar('minhaNovaFuncao', 14, 0);
```

E crie a função em qualquer lugar do arquivo:

```javascript
function minhaNovaFuncao() {
  if (_finalDeSemana()) return;
  enviarTelegram('Mensagem nova aqui');
}
```

Depois rode `instalarGatilhos` de novo (ele apaga os antigos e recria todos).

---

## Como o Gemini é usado

A função `chamarGemini(prompt)` faz uma requisição direta via `UrlFetchApp`
ao endpoint `gemini-2.0-flash`. Hoje ela é chamada em:

- **`bomDia()`** — classifica os emails das últimas 24h por importância.
- **`preBlocoFoco()`** — gera uma pergunta provocativa pra você escolher a tarefa.
- **`resumoDia()`** — escreve o resumo motivacional antes da aula.

Pra usar em outro lugar é só chamar `chamarGemini("seu prompt")`.

---

## Troubleshooting

- **Não chegou mensagem** → rode `testar` e olhe o log (Ctrl+Enter).
- **"Authorization required"** → repita o passo 5.1.
- **Gemini retornou vazio** → confira a `GEMINI_API_KEY`, modelo `gemini-2.0-flash`
  precisa estar habilitado na sua conta (padrão no AI Studio).
- **Quer mudar tom das mensagens** → edite os `prompt` dentro das funções
  `bomDia`, `preBlocoFoco`, `resumoDia`.
