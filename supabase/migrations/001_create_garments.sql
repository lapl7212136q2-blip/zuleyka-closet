create table if not exists garments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  -- metadata
  name text not null,
  category text not null, -- dress, shirt, pants, etc
  color text,
  material text,
  condition text default 'good', -- good, fair, worn

  -- image & analysis
  image_url text,
  image_path text, -- local path for analysis
  analysis_status text default 'pending', -- pending, completed, failed

  -- detected attributes (from rembg + local detection)
  primary_color text,
  pattern text, -- solid, striped, floral, etc
  fit_type text, -- fitted, loose, oversized, etc
  season text, -- spring, summer, fall, winter, all-season
  style text, -- casual, formal, sporty, etc

  -- user notes
  notes text,
  occasions text, -- comma-separated: work, casual, party, gym, etc

  -- search/filter tags
  tags text[], -- array of searchable tags

  -- stats
  wear_count integer default 0,
  last_worn_at timestamp with time zone
);

-- indexes for common queries
create index if not exists idx_garments_category on garments(category);
create index if not exists idx_garments_color on garments(primary_color);
create index if not exists idx_garments_style on garments(style);
create index if not exists idx_garments_status on garments(analysis_status);
create index if not exists idx_garments_tags on garments using gin(tags);
