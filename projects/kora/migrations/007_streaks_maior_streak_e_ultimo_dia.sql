-- Adiciona colunas necessárias para o cron/streak persistir streak corretamente
-- maior_streak: recorde histórico do usuário
-- ultimo_dia: data do último processamento (evita duplo-cômputo)

alter table streaks
  add column if not exists maior_streak integer not null default 0,
  add column if not exists ultimo_dia date;

-- Inicializa maior_streak com streak_atual para usuários existentes
update streaks set maior_streak = streak_atual where maior_streak = 0 and streak_atual > 0;
