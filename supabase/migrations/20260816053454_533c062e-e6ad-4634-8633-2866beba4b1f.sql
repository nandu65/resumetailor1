create table public.resume_versions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    resume_data jsonb not null,
    template_id text not null,
    created_at timestamptz default now() not null
);

grant select, insert, update, delete on public.resume_versions to authenticated;
grant all on public.resume_versions to service_role;

alter table public.resume_versions enable row level security;

create policy "Users can manage their own resume versions"
on public.resume_versions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
