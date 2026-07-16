-- Profiles table: one row per auth user, tracks subscription state.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  subscription_status text not null default 'inactive', -- 'inactive' | 'active' | 'cancelled'
  plan text, -- 'starter' | 'pro'
  paystack_customer_code text,
  paystack_subscription_code text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own non-sensitive fields"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Payment history, written only by the paystack-verify / paystack-webhook
-- edge functions using the service role key — never from the client.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  reference text unique not null,
  plan text not null,
  amount_kobo integer not null,
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users can view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Storage bucket for user-uploaded chart screenshots. Kept private (not
-- public) — access happens only via short-lived signed URLs generated
-- for the uploading user, or from the analyze-chart-image edge function.
insert into storage.buckets (id, name, public)
values ('chart-uploads', 'chart-uploads', false)
on conflict (id) do nothing;

create policy "Users can upload their own chart images"
  on storage.objects for insert
  with check (bucket_id = 'chart-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view their own chart images"
  on storage.objects for select
  using (bucket_id = 'chart-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own chart images"
  on storage.objects for delete
  using (bucket_id = 'chart-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
