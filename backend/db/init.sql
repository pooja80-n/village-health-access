create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key,
  name text,
  phone text,
  village text,
  created_at timestamptz
);

create table appointments (
  id uuid primary key,
  patient_id uuid references profiles(id),
  symptoms text[],
  triage jsonb,
  status text,
  created_at timestamptz
);

create table orders (
  id uuid primary key,
  patient_id uuid references profiles(id),
  medicine text,
  status text,
  created_at timestamptz
);

create table ambulance_requests (
  id uuid primary key,
  profile_id uuid references profiles(id),
  latitude double precision,
  longitude double precision,
  appointment_id uuid,
  requested_at timestamptz
);

create table health_tips (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text,
  language text,
  created_at timestamptz default now()
);
