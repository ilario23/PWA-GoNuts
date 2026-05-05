-- ============================================================================
-- Household seed: shared couple expenses + guest member
-- Target user (creator): d97fce5e-ad2a-4930-a7a5-7136d60daee1
-- Run in Supabase SQL Editor as postgres (or service role). Re-runnable.
--
-- Creates:
--   Group "Home together" (c0ffee10-0001-4000-8000-000000000001)
--   Members: you | Jordan (partner, guest) | Chris (guest friend)
--   18 group categories + 108 group expense transactions (Jan–May 2026)
--
-- TEARDOWN (manual): delete rows tied to group_id = 'c0ffee10-0001-4000-8000-000000000001'
-- ============================================================================

BEGIN;

-- Remove previous run of this seed (same stable IDs)
DELETE FROM public.transactions WHERE group_id = 'c0ffee10-0001-4000-8000-000000000001'::uuid;
DELETE FROM public.recurring_transactions WHERE group_id = 'c0ffee10-0001-4000-8000-000000000001'::uuid;
DELETE FROM public.category_budgets WHERE category_id IN (
  SELECT id FROM public.categories WHERE group_id = 'c0ffee10-0001-4000-8000-000000000001'::uuid
);
DELETE FROM public.categories WHERE group_id = 'c0ffee10-0001-4000-8000-000000000001'::uuid;
DELETE FROM public.group_members WHERE group_id = 'c0ffee10-0001-4000-8000-000000000001'::uuid;
DELETE FROM public.groups WHERE id = 'c0ffee10-0001-4000-8000-000000000001'::uuid;

INSERT INTO public.groups (id, name, description, created_by)
VALUES (
  'c0ffee10-0001-4000-8000-000000000001'::uuid,
  'Home together',
  'Shared household: rent, groceries, bills — couple + occasional guest',
  'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid
);

INSERT INTO public.group_members (id, group_id, user_id, guest_name, is_guest, share)
VALUES
  ('c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, NULL, false, 45),
  ('c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, NULL, 'Jordan', true, 45),
  ('c0ffee10-0002-4000-8000-000000000003'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, NULL, 'Chris', true, 10);


INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000001'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Rent & mortgage', 'Home', '#DC2626', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000002'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Utilities', 'Zap', '#EA580C', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000003'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Internet & mobile', 'Wifi', '#2563EB', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000004'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Groceries', 'ShoppingCart', '#16A34A', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000005'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Dining out', 'Utensils', '#DB2777', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000006'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Food delivery', 'Pizza', '#CA8A04', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000007'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Repairs & DIY', 'Hammer', '#78716C', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000008'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Furniture & décor', 'Armchair', '#9333EA', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000009'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Cleaning supplies', 'Bath', '#0891B2', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000010'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Streaming & apps', 'Tv', '#4F46E5', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000011'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Pets', 'Dog', '#C026D3', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000012'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Health & pharmacy', 'Pill', '#E11D48', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000013'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Shared transport', 'Car', '#0D9488', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000014'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Gifts & celebrations', 'Gift', '#DB2777', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000015'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Entertainment', 'Ticket', '#7C3AED', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000016'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Household misc', 'ShoppingBag', '#64748B', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000017'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Garden & balcony', 'TreePine', '#15803D', 'expense', true);
INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, active)
VALUES ('c0ffee10-0003-4000-8000-000000000018'::uuid, 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'Home insurance', 'Landmark', '#475569', 'expense', true);

INSERT INTO public.transactions (id, user_id, group_id, paid_by_member_id, category_id, type, amount, date, description)
VALUES

  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000001'::uuid, 'expense', 1185.5, '2026-01-01'::date, 'Rent / mortgage transfer'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 17.99, '2026-01-02'::date, 'Netflix household'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 10.99, '2026-01-02'::date, 'Spotify Duo'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 58, '2026-01-03'::date, 'Pizza night — Da Michele'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 94.5, '2026-01-04'::date, 'Weekly groceries — Esselunga'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000003'::uuid, 'expense', 29.99, '2026-01-05'::date, 'Fiber internet — Vodafone'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 42, '2026-01-06'::date, 'Fuel — shared car'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000009'::uuid, 'expense', 18.4, '2026-01-07'::date, 'DM — detergents & sponges'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 64.2, '2026-01-08'::date, 'Electricity (ENEL)'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000006'::uuid, 'expense', 28.5, '2026-01-09'::date, 'Glovo — late dinner'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 112.3, '2026-01-11'::date, 'Big weekend shop + wine'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000008'::uuid, 'expense', 45.9, '2026-01-13'::date, 'IKEA — shelves & boxes'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 84.5, '2026-01-14'::date, 'Anniversary dinner'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000018'::uuid, 'expense', 189, '2026-01-15'::date, 'Home insurance quarterly'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000011'::uuid, 'expense', 48.5, '2026-01-16'::date, 'Vet check-up — Luna'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000006'::uuid, 'expense', 34.2, '2026-01-17'::date, 'Deliveroo — Indian'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 78.2, '2026-01-18'::date, 'Quick Aldi run'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 38.5, '2026-01-19'::date, 'Fuel'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 42, '2026-01-20'::date, 'Sushi lunch Sunday'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000015'::uuid, 'expense', 22, '2026-01-21'::date, 'Board game & snacks night'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 38.5, '2026-01-22'::date, 'Natural gas'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 103.9, '2026-01-25'::date, 'Monthly bulk + detergents'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000007'::uuid, 'expense', 12.5, '2026-01-26'::date, 'Hardware — light bulb hallway'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000012'::uuid, 'expense', 23.4, '2026-01-29'::date, 'Pharmacy — vitamins & cold meds'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 88.4, '2026-02-01'::date, 'Groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000001'::uuid, 'expense', 1185.5, '2026-02-01'::date, 'Rent / mortgage transfer'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 63.2, '2026-02-02'::date, 'Brunch café'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 17.99, '2026-02-02'::date, 'Netflix'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 10.99, '2026-02-02'::date, 'Spotify Duo'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000009'::uuid, 'expense', 24.9, '2026-02-03'::date, 'Refill cleaning supplies'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000007'::uuid, 'expense', 189, '2026-02-04'::date, 'Leroy Merlin — paint & rollers'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000003'::uuid, 'expense', 29.99, '2026-02-05'::date, 'Fiber internet'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 45.2, '2026-02-07'::date, 'Fuel + car wash'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000014'::uuid, 'expense', 65, '2026-02-08'::date, 'Birthday gift — Jordan sister'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 121.6, '2026-02-08'::date, 'Farmers market + fish'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 71.3, '2026-02-10'::date, 'Electricity'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000011'::uuid, 'expense', 32, '2026-02-11'::date, 'Premium dog food bag'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000006'::uuid, 'expense', 31.9, '2026-02-12'::date, 'Uber Eats'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000016'::uuid, 'expense', 28, '2026-02-14'::date, 'LED bulbs pack'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 115, '2026-02-14'::date, 'Valentine dinner'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 67.3, '2026-02-15'::date, 'Sunday supermarket'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 42.1, '2026-02-18'::date, 'Water & sewer'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000007'::uuid, 'expense', 62, '2026-02-19'::date, 'Electrician minor fix (split)'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 48.5, '2026-02-21'::date, 'Burgers + beers'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 95.8, '2026-02-22'::date, 'Groceries + pet food aisle'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 40, '2026-02-25'::date, 'Fuel'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000007'::uuid, 'expense', 8.9, '2026-02-26'::date, 'Key copy duplicate'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000001'::uuid, 'expense', 1192, '2026-03-01'::date, 'Rent / mortgage transfer'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 99.1, '2026-03-01'::date, 'Weekly groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 17.99, '2026-03-02'::date, 'Netflix'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 10.99, '2026-03-02'::date, 'Spotify Duo'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000006'::uuid, 'expense', 26.5, '2026-03-03'::date, 'Friday pizza delivery'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000003'::uuid, 'expense', 29.99, '2026-03-05'::date, 'Fiber internet'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000012'::uuid, 'expense', 41.2, '2026-03-05'::date, 'Pharmacy — prescription refill'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000003'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 56, '2026-03-06'::date, 'Chris bought groceries for dinner party'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000003'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 72, '2026-03-06'::date, 'Thai with Chris (split dinner)'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 38, '2026-03-07'::date, 'Coffee & pastries — morning'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000003'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 24, '2026-03-07'::date, 'Wine — Chris brought bottle'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 84.7, '2026-03-08'::date, 'Groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000014'::uuid, 'expense', 48, '2026-03-08'::date, 'Mother Day flowers'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 68.9, '2026-03-09'::date, 'Electricity'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000008'::uuid, 'expense', 78.4, '2026-03-11'::date, 'New curtains bedroom'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 36.8, '2026-03-12'::date, 'Fuel'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000015'::uuid, 'expense', 18.5, '2026-03-13'::date, 'Steam game sale — couch co-op'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 91, '2026-03-14'::date, 'Seafood restaurant'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 118.2, '2026-03-15'::date, 'Stock-up before trip'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000009'::uuid, 'expense', 19.2, '2026-03-18'::date, 'Laundry pods bulk'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000016'::uuid, 'expense', 15.5, '2026-03-19'::date, 'Extension cord & power strip'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 54.5, '2026-03-21'::date, 'Nepalese takeaway'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 76.5, '2026-03-22'::date, 'Groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 35.8, '2026-03-24'::date, 'Gas heating adjustment'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000011'::uuid, 'expense', 28.5, '2026-03-25'::date, 'Treats & toys'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000006'::uuid, 'expense', 29, '2026-03-28'::date, 'Sushi delivery movie night'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 104.3, '2026-03-29'::date, 'Easter chocolate + groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 44.1, '2026-03-30'::date, 'Fuel weekend trip'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000001'::uuid, 'expense', 1192, '2026-04-01'::date, 'Rent / mortgage transfer'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 67.8, '2026-04-01'::date, 'Trattoria Saturday'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 17.99, '2026-04-02'::date, 'Netflix'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000017'::uuid, 'expense', 44, '2026-04-02'::date, 'Plants & soil — balcony spring'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 10.99, '2026-04-02'::date, 'Spotify Duo'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000007'::uuid, 'expense', 34.5, '2026-04-03'::date, 'Hardware store — screws & hooks'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000003'::uuid, 'expense', 29.99, '2026-04-05'::date, 'Fiber internet'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 91.2, '2026-04-05'::date, 'Weekly groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 39.9, '2026-04-06'::date, 'Fuel'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 49.2, '2026-04-08'::date, 'Ramen bar'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000015'::uuid, 'expense', 45, '2026-04-11'::date, 'Concert tickets (both)'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 59.4, '2026-04-11'::date, 'Electricity'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000010'::uuid, 'expense', 45, '2026-04-12'::date, 'Disney+ yearly promo (split)'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 87.9, '2026-04-12'::date, 'Groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000006'::uuid, 'expense', 22.8, '2026-04-14'::date, 'Kebab delivery'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000018'::uuid, 'expense', 189, '2026-04-15'::date, 'Home insurance quarterly'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000003'::uuid, 'expense', 24, '2026-04-15'::date, 'Mobile plans top-up (both)'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 128, '2026-04-16'::date, 'Parents dinner out'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000011'::uuid, 'expense', 54, '2026-04-17'::date, 'Vaccination booster'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000017'::uuid, 'expense', 22.3, '2026-04-18'::date, 'Garden center herbs'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 132.4, '2026-04-19'::date, 'BBQ supplies weekend'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000014'::uuid, 'expense', 55, '2026-04-20'::date, 'Housewarming bottle & chocolates'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000009'::uuid, 'expense', 21.6, '2026-04-21'::date, 'Toilet paper stock-up'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 61.5, '2026-04-23'::date, 'Tacos + margaritas'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 47.3, '2026-04-24'::date, 'Fuel + motorway toll'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 79.6, '2026-04-26'::date, 'Groceries'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 41.2, '2026-04-26'::date, 'Water bill Q2'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000016'::uuid, 'expense', 31, '2026-04-28'::date, 'Dry cleaning — suits'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000005'::uuid, 'expense', 73, '2026-05-01'::date, 'Sunday roast pub'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000006'::uuid, 'expense', 35.5, '2026-05-02'::date, 'Lazy Saturday takeaway'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000002'::uuid, 'expense', 52.7, '2026-05-03'::date, 'Electricity May partial'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000002'::uuid, 'c0ffee10-0003-4000-8000-000000000004'::uuid, 'expense', 96.3, '2026-05-04'::date, 'Groceries + household paper'),
  (uuid_generate_v4(), 'd97fce5e-ad2a-4930-a7a5-7136d60daee1'::uuid, 'c0ffee10-0001-4000-8000-000000000001'::uuid, 'c0ffee10-0002-4000-8000-000000000001'::uuid, 'c0ffee10-0003-4000-8000-000000000013'::uuid, 'expense', 41.5, '2026-05-05'::date, 'Fuel')
;

COMMIT;

