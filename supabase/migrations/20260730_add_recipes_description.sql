-- Persist the AI-generated one-sentence recipe description, which was
-- previously only held in memory during generation and discarded on save.
alter table public.recipes
  add column if not exists description text not null default '';
