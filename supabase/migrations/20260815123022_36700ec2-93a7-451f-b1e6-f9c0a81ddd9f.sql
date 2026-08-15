create table public.resume_drafts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    resume_data jsonb not null,
    template_id text not null default 'modern',
    updated_at timestamptz default now() not null,
    unique (user_id)
);

grant select, insert, update, delete on public.resume_drafts to authenticated;
grant all on public.resume_drafts to service_role;

alter table public.resume_drafts enable row level security;

create policy "Users can manage their own resume drafts"
on public.resume_drafts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
