create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  name text not null,
  description text,
  occasion text, -- work, casual, party, gym, etc
  season text,
  garment_ids uuid[], -- array of garment IDs in outfit

  -- metadata
  rating integer, -- user rating 1-5
  wear_count integer default 0,
  last_worn_at timestamp with time zone
);

create index if not exists idx_outfits_occasion on outfits(occasion);
create index if not exists idx_outfits_season on outfits(season);
