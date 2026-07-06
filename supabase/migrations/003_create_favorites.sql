create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),

  user_id uuid not null, -- would be auth.users.id when using Supabase Auth
  garment_id uuid not null references garments(id) on delete cascade,

  unique(user_id, garment_id)
);

create index if not exists idx_favorites_user on favorites(user_id);
create index if not exists idx_favorites_garment on favorites(garment_id);
