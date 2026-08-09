-- Persist per-recipe substitution chat turns so the thread survives
-- reopening a saved recipe instead of resetting to empty every time.
create table if not exists public.recipe_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(recipe_id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists recipe_chat_messages_user_recipe_idx
  on public.recipe_chat_messages (user_id, recipe_id, created_at);

alter table public.recipe_chat_messages enable row level security;

create policy "Users can view their own chat messages"
  on public.recipe_chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
  on public.recipe_chat_messages for insert
  with check (auth.uid() = user_id);
