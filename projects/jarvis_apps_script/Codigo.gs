/**
 * ============================================================
 *  JARVIS PESSOAL — Google Apps Script
 *  Assistente diário do Gustavo (Calendar + Gmail + Telegram + Gemini)
 * ============================================================
 *
 *  COMO USAR (resumo — instruções completas no README.md):
 *   1. script.google.com → Novo projeto → cole este arquivo
 *   2. Em "Configurações do projeto" → marque "Mostrar appsscript.json"
 *   3. Cole o conteúdo de appsscript.json
 *   4. Em "Propriedades do script" cadastre:
 *        TELEGRAM_TOKEN   = token do BotFather
 *        TELEGRAM_CHAT_ID = seu chat_id
 *        GEMINI_API_KEY   = chave do Google AI Studio
 *   5. Rode 1x a função `instalarGatilhos()` (autoriza permissões)
 *   6. Pronto. Ele roda sozinho de seg–sex.
 *
 *  Para adicionar lembretes novos: ver função `instalarGatilhos()`
 *  no fim do arquivo — basta acrescentar uma linha.
 * ============================================================ */


// ────────────────────────────────────────────────────────────
//  CONFIG
// ────────────────────────────────────────────────────────────
const PROPS = PropertiesService.getScriptProperties();
const TZ    = 'America/Sao_Paulo';

function _prop(k) {
  const v = PROPS.getProperty(k);
  if (!v) throw new Error(`Propriedade ${k} não configurada em "Propriedades do script".`);
  return v;
}


// ────────────────────────────────────────────────────────────
//  TELEGRAM
// ────────────────────────────────────────────────────────────
function enviarTelegram(texto) {
  const url = `https://api.telegram.org/bot${_prop('TELEGRAM_TOKEN')}/sendMessage`;
  const payload = {
    chat_id: _prop('TELEGRAM_CHAT_ID'),
    text: texto,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}


// ────────────────────────────────────────────────────────────
//  GEMINI
// ────────────────────────────────────────────────────────────
function chamarGemini(prompt) {
  const key = _prop('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 800 }
  };
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    const data = JSON.parse(res.getContentText());
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '(sem resposta do Gemini)';
  } catch (e) {
    return `(erro Gemini: ${e.message})`;
  }
}


// ────────────────────────────────────────────────────────────
//  HELPERS — Calendar / Gmail
// ────────────────────────────────────────────────────────────
function eventosDeHoje() {
  const hoje = new Date();
  const fim  = new Date(hoje); fim.setHours(23, 59, 59);
  const eventos = CalendarApp.getDefaultCalendar().getEvents(hoje, fim);
  if (!eventos.length) return 'Nenhum compromisso na agenda hoje.';
  return eventos.map(e => {
    const h = Utilities.formatDate(e.getStartTime(), TZ, 'HH:mm');
    return `• ${h} — ${e.getTitle()}`;
  }).join('\n');
}

function emailsUltimas24h() {
  const threads = GmailApp.search('newer_than:1d -category:promotions -category:social', 0, 30);
  return threads.map(t => {
    const m = t.getMessages()[0];
    return {
      de: m.getFrom(),
      assunto: m.getSubject(),
      preview: m.getPlainBody().slice(0, 250).replace(/\s+/g, ' ')
    };
  });
}


// ────────────────────────────────────────────────────────────
//  ROTINAS DIÁRIAS
// ────────────────────────────────────────────────────────────

// 07:40 — bom dia + agenda + análise de emails
function bomDia() {
  if (_finalDeSemana()) return;

  const agenda = eventosDeHoje();
  const emails = emailsUltimas24h();

  const prompt = `Você é o Jarvis, assistente pessoal do Gustavo (CEO, 22 anos, BR).
Tom: amigo, direto, brasileiro, sem ser chato. Use no máximo 6 linhas.

Analise estes emails das últimas 24h e identifique os IMPORTANTES (vaga de estágio,
cobrança, prazo, faculdade, dinheiro, oportunidades). Ignore newsletter/spam.

EMAILS:
${JSON.stringify(emails, null, 2)}

Responda no formato:
"Bom dia! Você tem X emails que merecem atenção:
1. ...
2. ..."
Se não tiver nada importante, fale isso de boa.`;

  const resumoEmails = chamarGemini(prompt);

  const msg =
`☀️ *Bom dia, Gustavo!*

📅 *Agenda de hoje:*
${agenda}

📬 *Inbox:*
${resumoEmails}

Bora fazer o dia render. 💪`;
  enviarTelegram(msg);
}

// 08:50 — pré bloco foco
function preBlocoFoco() {
  if (_finalDeSemana()) return;

  const prompt = `Você é o Jarvis. Sugira UMA pergunta curta e provocativa
pro Gustavo definir qual tarefa vai atacar no bloco de foco profundo de 9h–13h.
Tom: amigo, BR, direto. 1–2 linhas no máximo.`;
  const sug = chamarGemini(prompt);

  enviarTelegram(`🎯 *Foco em 10 min* (9h–13h)\n\n${sug}\n\nMe responde aqui qual vai ser a missão.`);
  PROPS.setProperty('ULTIMA_RESPOSTA_FOCO', String(Date.now()));
}

// 11:00 — checagem leve durante foco (se ficou 2h+ quieto)
function checagemFoco() {
  if (_finalDeSemana()) return;
  const ultima = Number(PROPS.getProperty('ULTIMA_RESPOSTA_FOCO') || 0);
  const horas = (Date.now() - ultima) / 36e5;
  if (horas >= 2) {
    enviarTelegram('👀 Já tem umas 2h no foco. Tá fluindo ou travou? Se precisar destravar, me chama.');
  }
}

// 13:20 — Alice
function avisoAlice() {
  if (_finalDeSemana()) return;
  enviarTelegram('💛 Alice liga em 10 min. Fecha o laptop e curte esse tempo com ela.');
}

// 15:20 — academia
function avisoAcademia() {
  if (_finalDeSemana()) return;
  enviarTelegram('🏋️ Academia em 10 min. Bora? Pega a garrafinha e vai.');
}

// 16:40 — estágio
function avisoEstagio() {
  if (_finalDeSemana()) return;
  enviarTelegram('💼 Bloco Estágio (16:30–18:30). O que precisa entregar hoje? Me fala em 1 linha.');
}

// 18:30 — resumo do dia + aula
function resumoDia() {
  if (_finalDeSemana()) return;

  const agenda = eventosDeHoje();
  const prompt = `Você é o Jarvis. Faça um resumo MOTIVACIONAL e curto (4–5 linhas)
pro Gustavo antes da aula das 19:30. Lembra que ele acordou 7:30, fez foco,
treinou e estagiou. Tom: amigo, BR, sem clichê. Termina perguntando se ele
quer registrar algum aprendizado do dia.

Agenda do dia foi:
${agenda}`;
  const txt = chamarGemini(prompt);

  enviarTelegram(`📚 *Aula em 1h*\n\n${txt}`);
}

// 23:00 — fim de noite
function fimDeNoite() {
  enviarTelegram(
`🌙 *Final do dia*

Como foi com a Alice hoje? Tá tudo bem entre vocês?

Sugiro dormir até *00:00* pra acordar 7:30 inteiro. 😴`);
}


// ────────────────────────────────────────────────────────────
//  UTILS
// ────────────────────────────────────────────────────────────
function _finalDeSemana() {
  const d = new Date().getDay(); // 0=dom 6=sab
  return d === 0 || d === 6;
}

// Marca quando você responder algo (chamada via webhook futuro — opcional)
function registrarRespostaFoco() {
  PROPS.setProperty('ULTIMA_RESPOSTA_FOCO', String(Date.now()));
}


// ────────────────────────────────────────────────────────────
//  INSTALAÇÃO DE GATILHOS
//  Rode esta função UMA VEZ pelo editor pra autorizar e criar os triggers.
//  Pra adicionar lembrete novo: copie uma linha _criar(...) abaixo.
// ────────────────────────────────────────────────────────────
function instalarGatilhos() {
  // limpa triggers antigos
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  const _criar = (funcao, hora, minuto) => {
    ScriptApp.newTrigger(funcao).timeBased().everyDays(1).atHour(hora).nearMinute(minuto).create();
  };

  _criar('bomDia',         7, 40);
  _criar('preBlocoFoco',   8, 50);
  _criar('checagemFoco',  11,  0);
  _criar('avisoAlice',    13, 20);
  _criar('avisoAcademia', 15, 20);
  _criar('avisoEstagio',  16, 40);
  _criar('resumoDia',     18, 30);
  _criar('fimDeNoite',    23,  0);

  enviarTelegram('✅ Jarvis ativado. 8 gatilhos instalados. Bora.');
}

// Teste rápido (rode manualmente pra ver se tudo conecta)
function testar() {
  enviarTelegram('🤖 Teste: Telegram OK.');
  Logger.log(chamarGemini('Diga "Gemini OK" em 3 palavras.'));
  Logger.log(eventosDeHoje());
}
