-- Run this in your Supabase SQL Editor

-- 1. Profiles table (auto-created from auth)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  bio text,
  updated_at timestamp with time zone default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Articles table
create table if not exists articles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  content text not null,
  views integer default 0,
  created_at timestamp with time zone default now()
);

-- 3. Comments table (supports replies via parent_id)
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  article_id uuid references articles on delete cascade,
  user_id uuid references auth.users on delete cascade,
  parent_id uuid references comments on delete cascade, -- null = top-level comment
  content text not null,
  created_at timestamp with time zone default now()
);

-- 4. Notifications table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  type text, -- 'comment', 'reply', 'like'
  message text not null,
  link text,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table articles enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;

-- RLS Policies
create policy "Public profiles" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

create policy "Anyone can read articles" on articles for select using (true);
create policy "Auth users can post articles" on articles for insert with check (auth.uid() = user_id);
create policy "Auth users can update own articles" on articles for update using (auth.uid() = user_id);

create policy "Anyone can read comments" on comments for select using (true);
create policy "Auth users can post comments" on comments for insert with check (auth.uid() = user_id);

create policy "Users read own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on notifications for update using (auth.uid() = user_id);

-- Enable realtime for notifications
alter publication supabase_realtime add table notifications;
