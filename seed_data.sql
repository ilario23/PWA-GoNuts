-- ============================================================================
-- SEED DATA - 2 Users with Shared Group
-- User 1: b71c594d-0f53-4408-873f-d210c53bd7aa (Mario)
-- User 2: b74f26db-c1cd-45c9-8e2e-56221e42506e (Laura)
-- ============================================================================

DO $$
DECLARE
  user1_id uuid := 'b71c594d-0f53-4408-873f-d210c53bd7aa';
  user2_id uuid := 'b74f26db-c1cd-45c9-8e2e-56221e42506e';
  
  -- Shared Group
  grp_casa uuid := uuid_generate_v4();
  
  -- Contexts (User 1)
  ctx1_vacanze uuid := uuid_generate_v4();
  ctx1_lavoro uuid := uuid_generate_v4();
  
  -- Contexts (User 2)
  ctx2_vacanze uuid := uuid_generate_v4();
  ctx2_lavoro uuid := uuid_generate_v4();
  
  -- Categories User 1 - EXPENSE
  u1_cat_trasporti uuid := uuid_generate_v4();
  u1_cat_ristoranti uuid := uuid_generate_v4();
  u1_cat_intrattenimento uuid := uuid_generate_v4();
  u1_cat_salute uuid := uuid_generate_v4();
  u1_cat_abbonamenti uuid := uuid_generate_v4();
  u1_cat_auto uuid := uuid_generate_v4();
  u1_cat_carburante uuid := uuid_generate_v4();
  u1_cat_pranzo uuid := uuid_generate_v4();
  u1_cat_cena uuid := uuid_generate_v4();
  u1_cat_cinema uuid := uuid_generate_v4();
  u1_cat_palestra uuid := uuid_generate_v4();
  u1_cat_streaming uuid := uuid_generate_v4();
  
  -- Categories User 2 - EXPENSE
  u2_cat_shopping uuid := uuid_generate_v4();
  u2_cat_beauty uuid := uuid_generate_v4();
  u2_cat_hobby uuid := uuid_generate_v4();
  u2_cat_telefono uuid := uuid_generate_v4();
  
  -- Shared Group Categories - EXPENSE
  grp_cat_spesa uuid := uuid_generate_v4();
  grp_cat_casa uuid := uuid_generate_v4();
  grp_cat_supermercato uuid := uuid_generate_v4();
  grp_cat_utenze uuid := uuid_generate_v4();
  grp_cat_affitto uuid := uuid_generate_v4();
  
  -- Categories User 1 - INCOME
  u1_cat_stipendio uuid := uuid_generate_v4();
  u1_cat_freelance uuid := uuid_generate_v4();
  
  -- Categories User 2 - INCOME
  u2_cat_stipendio uuid := uuid_generate_v4();
  u2_cat_bonus uuid := uuid_generate_v4();
  
  -- Categories - INVESTMENT
  u1_cat_etf uuid := uuid_generate_v4();
  u2_cat_risparmi uuid := uuid_generate_v4();

BEGIN

  -- ==========================================================================
  -- USER PROFILES
  -- ==========================================================================
  INSERT INTO public.profiles (id, email, full_name) VALUES
    (user1_id, 'mario.rossi@example.com', 'Mario Rossi'),
    (user2_id, 'laura.bianchi@example.com', 'Laura Bianchi');

  -- ==========================================================================
  -- SHARED GROUP
  -- ==========================================================================
  INSERT INTO public.groups (id, name, description, created_by) VALUES
    (grp_casa, 'Casa Condivisa', 'Spese condivise appartamento', user1_id);

  INSERT INTO public.group_members (group_id, user_id, share) VALUES
    (grp_casa, user1_id, 50),
    (grp_casa, user2_id, 50);

  -- ==========================================================================
  -- CONTEXTS
  -- ==========================================================================
  INSERT INTO public.contexts (id, user_id, name, description, active) VALUES
    (ctx1_vacanze, user1_id, 'Vacanze', 'Mario - Viaggi', true),
    (ctx1_lavoro, user1_id, 'Lavoro', 'Mario - Spese lavoro', true),
    (ctx2_vacanze, user2_id, 'Vacanze', 'Laura - Viaggi', true),
    (ctx2_lavoro, user2_id, 'Lavoro', 'Laura - Spese lavoro', true);

  -- ==========================================================================
  -- CATEGORIES - SHARED GROUP
  -- ==========================================================================
  INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, parent_id, active) VALUES
    (grp_cat_spesa, user1_id, grp_casa, 'Spesa', 'ShoppingCart', '#10b981', 'expense', NULL, true),
    (grp_cat_casa, user1_id, grp_casa, 'Casa', 'Home', '#6366f1', 'expense', NULL, true);

  INSERT INTO public.categories (id, user_id, group_id, name, icon, color, type, parent_id, active) VALUES
    (grp_cat_supermercato, user1_id, grp_casa, 'Supermercato', 'ShoppingCart', '#10b981', 'expense', grp_cat_spesa, true),
    (grp_cat_affitto, user1_id, grp_casa, 'Affitto', 'Home', '#6366f1', 'expense', grp_cat_casa, true),
    (grp_cat_utenze, user1_id, grp_casa, 'Utenze', 'Lightbulb', '#6366f1', 'expense', grp_cat_casa, true);

  -- ==========================================================================
  -- CATEGORIES - USER 1 PERSONAL
  -- ==========================================================================
  INSERT INTO public.categories (id, user_id, name, icon, color, type, parent_id, active) VALUES
    (u1_cat_trasporti, user1_id, 'Trasporti', 'Car', '#f59e0b', 'expense', NULL, true),
    (u1_cat_ristoranti, user1_id, 'Ristoranti', 'Utensils', '#ef4444', 'expense', NULL, true),
    (u1_cat_intrattenimento, user1_id, 'Intrattenimento', 'Gamepad2', '#8b5cf6', 'expense', NULL, true),
    (u1_cat_salute, user1_id, 'Salute', 'Heart', '#14b8a6', 'expense', NULL, true),
    (u1_cat_abbonamenti, user1_id, 'Abbonamenti', 'Smartphone', '#64748b', 'expense', NULL, true);

  INSERT INTO public.categories (id, user_id, name, icon, color, type, parent_id, active) VALUES
    (u1_cat_auto, user1_id, 'Auto', 'Car', '#f59e0b', 'expense', u1_cat_trasporti, true),
    (u1_cat_carburante, user1_id, 'Carburante', 'Fuel', '#f59e0b', 'expense', u1_cat_auto, true),
    (u1_cat_pranzo, user1_id, 'Pranzo', 'Sun', '#ef4444', 'expense', u1_cat_ristoranti, true),
    (u1_cat_cena, user1_id, 'Cena', 'Moon', '#ef4444', 'expense', u1_cat_ristoranti, true),
    (u1_cat_cinema, user1_id, 'Cinema', 'Tv', '#8b5cf6', 'expense', u1_cat_intrattenimento, true),
    (u1_cat_palestra, user1_id, 'Palestra', 'Dumbbell', '#14b8a6', 'expense', u1_cat_salute, true),
    (u1_cat_streaming, user1_id, 'Streaming', 'Tv', '#64748b', 'expense', u1_cat_abbonamenti, true);

  INSERT INTO public.categories (id, user_id, name, icon, color, type, active) VALUES
    (u1_cat_stipendio, user1_id, 'Stipendio', 'DollarSign', '#22c55e', 'income', true),
    (u1_cat_freelance, user1_id, 'Freelance', 'Briefcase', '#22c55e', 'income', true),
    (u1_cat_etf, user1_id, 'ETF', 'TrendingUp', '#3b82f6', 'investment', true);

  -- ==========================================================================
  -- CATEGORIES - USER 2 PERSONAL
  -- ==========================================================================
  INSERT INTO public.categories (id, user_id, name, icon, color, type, parent_id, active) VALUES
    (u2_cat_shopping, user2_id, 'Shopping', 'ShoppingBag', '#ec4899', 'expense', NULL, true),
    (u2_cat_beauty, user2_id, 'Beauty', 'Sparkles', '#f472b6', 'expense', NULL, true),
    (u2_cat_hobby, user2_id, 'Hobby', 'Heart', '#8b5cf6', 'expense', NULL, true),
    (u2_cat_telefono, user2_id, 'Telefono', 'Smartphone', '#64748b', 'expense', NULL, true);

  INSERT INTO public.categories (id, user_id, name, icon, color, type, active) VALUES
    (u2_cat_stipendio, user2_id, 'Stipendio', 'DollarSign', '#22c55e', 'income', true),
    (u2_cat_bonus, user2_id, 'Bonus', 'Gift', '#22c55e', 'income', true),
    (u2_cat_risparmi, user2_id, 'Risparmi', 'DollarSign', '#3b82f6', 'investment', true);

  -- ==========================================================================
  -- USER SETTINGS
  -- ==========================================================================
  INSERT INTO public.user_settings (user_id, currency, theme, monthly_budget) VALUES
    (user1_id, 'EUR', 'dark', 1800),
    (user2_id, 'EUR', 'light', 1500);

  -- ==========================================================================
  -- CATEGORY BUDGETS
  -- ==========================================================================
  INSERT INTO public.category_budgets (user_id, category_id, amount, period) VALUES
    (user1_id, u1_cat_ristoranti, 200, 'monthly'),
    (user1_id, u1_cat_trasporti, 300, 'monthly'),
    (user2_id, u2_cat_shopping, 250, 'monthly');

  -- ==========================================================================
  -- RECURRING TRANSACTIONS
  -- ==========================================================================
  INSERT INTO public.recurring_transactions (
    user_id, group_id, paid_by_user_id, type, category_id, amount, 
    description, frequency, start_date, active
  ) VALUES
    -- User 1 Personal
    (user1_id, NULL, NULL, 'income', u1_cat_stipendio, 2500, 'Stipendio mensile', 'monthly', '2024-01-27', true),
    (user1_id, NULL, NULL, 'expense', u1_cat_palestra, 45, 'Abbonamento palestra', 'monthly', '2024-01-05', true),
    (user1_id, NULL, NULL, 'expense', u1_cat_streaming, 12.99, 'Netflix', 'monthly', '2024-01-08', true),
    (user1_id, NULL, NULL, 'investment', u1_cat_etf, 200, 'PAC ETF', 'monthly', '2024-01-03', true),
    
    -- User 2 Personal
    (user2_id, NULL, NULL, 'income', u2_cat_stipendio, 2200, 'Stipendio mensile', 'monthly', '2024-01-27', true),
    (user2_id, NULL, NULL, 'expense', u2_cat_telefono, 9.99, 'Iliad', 'monthly', '2024-01-10', true),
    
    -- Shared Group
    (user1_id, grp_casa, user1_id, 'expense', grp_cat_affitto, 800, 'Affitto mensile', 'monthly', '2024-01-01', true),
    (user2_id, grp_casa, user2_id, 'expense', grp_cat_utenze, 85, 'Bolletta luce', 'monthly', '2024-01-15', true);

  -- ==========================================================================
  -- TRANSACTIONS 2024-2025 (November focus)
  -- ==========================================================================
  
  -- USER 1 INCOME
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description) 
  SELECT user1_id, u1_cat_stipendio, 'income', 2500, 
    (date '2024-01-27' + (n * interval '1 month'))::date, 'Stipendio'
  FROM generate_series(0, 22) n 
  WHERE (date '2024-01-27' + (n * interval '1 month'))::date <= '2025-11-27';

  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description, context_id) VALUES
    (user1_id, u1_cat_freelance, 'income', 800, '2024-06-15', 'Progetto web', ctx1_lavoro),
    (user1_id, u1_cat_freelance, 'income', 600, '2024-10-20', 'Consulenza', ctx1_lavoro),
    (user1_id, u1_cat_freelance, 'income', 950, '2025-03-10', 'App mobile', ctx1_lavoro);

  -- USER 2 INCOME
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description) 
  SELECT user2_id, u2_cat_stipendio, 'income', 2200, 
    (date '2024-01-27' + (n * interval '1 month'))::date, 'Stipendio'
  FROM generate_series(0, 22) n 
  WHERE (date '2024-01-27' + (n * interval '1 month'))::date <= '2025-11-27';

  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description) VALUES
    (user2_id, u2_cat_bonus, 'income', 1500, '2024-07-15', 'Bonus semestrale'),
    (user2_id, u2_cat_bonus, 'income', 2000, '2024-12-20', 'Tredicesima');

  -- SHARED GROUP - Affitto
  INSERT INTO public.transactions (user_id, group_id, paid_by_user_id, category_id, type, amount, date, description) 
  SELECT user1_id, grp_casa, user1_id, grp_cat_affitto, 'expense', 800, 
    (date '2024-01-01' + (n * interval '1 month'))::date, 'Affitto Casa'
  FROM generate_series(0, 22) n 
  WHERE (date '2024-01-01' + (n * interval '1 month'))::date <= '2025-11-01';

  -- SHARED GROUP - Supermercato (weekly, alternating who pays)
  INSERT INTO public.transactions (user_id, group_id, paid_by_user_id, category_id, type, amount, date, description)
  SELECT 
    CASE WHEN n % 2 = 0 THEN user1_id ELSE user2_id END,
    grp_casa,
    CASE WHEN n % 2 = 0 THEN user1_id ELSE user2_id END,
    grp_cat_supermercato, 'expense',
    (random() * 40 + 60)::numeric(10,2),
    (date '2024-01-06' + (n * 7) * interval '1 day')::date,
    CASE WHEN n % 2 = 0 THEN 'Spesa Esselunga (Mario)' ELSE 'Spesa Coop (Laura)' END
  FROM generate_series(0, 100) n
  WHERE (date '2024-01-06' + (n * 7) * interval '1 day')::date <= '2025-11-26';

  -- SHARED GROUP - Utenze
  INSERT INTO public.transactions (user_id, group_id, paid_by_user_id, category_id, type, amount, date, description) VALUES
    (user2_id, grp_casa, user2_id, grp_cat_utenze, 'expense', 95, '2024-01-15', 'Bolletta luce'),
    (user1_id, grp_casa, user1_id, grp_cat_utenze, 'expense', 65, '2024-01-20', 'Bolletta gas'),
    (user2_id, grp_casa, user2_id, grp_cat_utenze, 'expense', 110, '2024-03-15', 'Bolletta luce'),
    (user1_id, grp_casa, user1_id, grp_cat_utenze, 'expense', 45, '2024-03-20', 'Bolletta gas'),
    (user2_id, grp_casa, user2_id, grp_cat_utenze, 'expense', 120, '2024-07-15', 'Bolletta luce'),
    (user1_id, grp_casa, user1_id, grp_cat_utenze, 'expense', 35, '2024-07-20', 'Bolletta gas'),
    (user2_id, grp_casa, user2_id, grp_cat_utenze, 'expense', 100, '2024-11-15', 'Bolletta luce'),
    (user1_id, grp_casa, user1_id, grp_cat_utenze, 'expense', 75, '2024-11-20', 'Bolletta gas'),
    (user2_id, grp_casa, user2_id, grp_cat_utenze, 'expense', 105, '2025-01-15', 'Bolletta luce'),
    (user1_id, grp_casa, user1_id, grp_cat_utenze, 'expense', 85, '2025-01-20', 'Bolletta gas');

  -- USER 1 PERSONAL - Carburante
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user1_id, u1_cat_carburante, 'expense',
    (random() * 20 + 55)::numeric(10,2),
    (date '2024-01-05' + (n * 14) * interval '1 day')::date, 'Benzina'
  FROM generate_series(0, 50) n
  WHERE (date '2024-01-05' + (n * 14) * interval '1 day')::date <= '2025-11-26';

  -- USER 1 PERSONAL - Pranzo
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description, context_id)
  SELECT user1_id, u1_cat_pranzo, 'expense',
    (random() * 8 + 12)::numeric(10,2),
    (date '2024-01-10' + (n * 12) * interval '1 day')::date,
    CASE WHEN n % 2 = 0 THEN 'Pranzo lavoro' ELSE 'Pausa pranzo' END,
    CASE WHEN n % 3 = 0 THEN ctx1_lavoro ELSE NULL END
  FROM generate_series(0, 60) n
  WHERE (date '2024-01-10' + (n * 12) * interval '1 day')::date <= '2025-11-26';

  -- USER 1 PERSONAL - Cena
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user1_id, u1_cat_cena, 'expense',
    (random() * 25 + 30)::numeric(10,2),
    (date '2024-01-20' + (n * 20) * interval '1 day')::date,
    CASE (n % 3) WHEN 0 THEN 'Cena pizzeria' WHEN 1 THEN 'Cena sushi' ELSE 'Cena ristorante' END
  FROM generate_series(0, 35) n
  WHERE (date '2024-01-20' + (n * 20) * interval '1 day')::date <= '2025-11-26';

  -- USER 1 PERSONAL - Cinema
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user1_id, u1_cat_cinema, 'expense', 12,
    (date '2024-01-28' + (n * interval '1 month'))::date, 'Cinema'
  FROM generate_series(0, 22) n
  WHERE (date '2024-01-28' + (n * interval '1 month'))::date <= '2025-11-26';

  -- USER 1 PERSONAL - Palestra
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user1_id, u1_cat_palestra, 'expense', 45,
    (date '2024-01-05' + (n * interval '1 month'))::date, 'Abbonamento palestra'
  FROM generate_series(0, 22) n
  WHERE (date '2024-01-05' + (n * interval '1 month'))::date <= '2025-11-26';

  -- USER 1 PERSONAL - Streaming
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user1_id, u1_cat_streaming, 'expense', 12.99,
    (date '2024-01-08' + (n * interval '1 month'))::date, 'Netflix'
  FROM generate_series(0, 22) n
  WHERE (date '2024-01-08' + (n * interval '1 month'))::date <= '2025-11-26';

  -- USER 2 PERSONAL - Shopping
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user2_id, u2_cat_shopping, 'expense',
    (random() * 60 + 40)::numeric(10,2),
    (date '2024-01-15' + (n * interval '2 months'))::date,
    CASE (n % 3) WHEN 0 THEN 'Zara' WHEN 1 THEN 'H&M' ELSE 'Bershka' END
  FROM generate_series(0, 11) n
  WHERE (date '2024-01-15' + (n * interval '2 months'))::date <= '2025-11-26';

  -- USER 2 PERSONAL - Beauty
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user2_id, u2_cat_beauty, 'expense',
    (random() * 30 + 25)::numeric(10,2),
    (date '2024-01-12' + (n * interval '1 month'))::date,
    CASE (n % 3) WHEN 0 THEN 'Parrucchiere' WHEN 1 THEN 'Sephora' ELSE 'Estetica' END
  FROM generate_series(0, 22) n
  WHERE (date '2024-01-12' + (n * interval '1 month'))::date <= '2025-11-26';

  -- USER 2 PERSONAL - Hobby
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description, context_id) VALUES
    (user2_id, u2_cat_hobby, 'expense', 65, '2024-03-10', 'Corso di pittura', NULL),
    (user2_id, u2_cat_hobby, 'expense', 45, '2024-06-15', 'Materiali artistici', NULL),
    (user2_id, u2_cat_hobby, 'expense', 85, '2024-09-20', 'Workshop fotografia', NULL),
    (user2_id, u2_cat_hobby, 'expense', 55, '2025-02-12', 'Libri', NULL),
    (user2_id, u2_cat_hobby, 'expense', 120, '2025-05-18', 'Corso yoga', NULL);

  -- USER 2 PERSONAL - Telefono
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user2_id, u2_cat_telefono, 'expense', 9.99,
    (date '2024-01-10' + (n * interval '1 month'))::date, 'Iliad'
  FROM generate_series(0, 22) n
  WHERE (date '2024-01-10' + (n * interval '1 month'))::date <= '2025-11-26';

  -- INVESTMENTS
  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description)
  SELECT user1_id, u1_cat_etf, 'investment', 200,
    (date '2024-01-03' + (n * interval '1 month'))::date, 'PAC ETF MSCI World'
  FROM generate_series(0, 22) n
  WHERE (date '2024-01-03' + (n * interval '1 month'))::date <= '2025-11-26';

  INSERT INTO public.transactions (user_id, category_id, type, amount, date, description) VALUES
    (user2_id, u2_cat_risparmi, 'investment', 500, '2024-02-15', 'Versamento risparmio'),
    (user2_id, u2_cat_risparmi, 'investment', 600, '2024-05-10', 'Versamento risparmio'),
    (user2_id, u2_cat_risparmi, 'investment', 700, '2024-08-20', 'Versamento risparmio'),
    (user2_id, u2_cat_risparmi, 'investment', 500, '2024-11-15', 'Versamento risparmio'),
    (user2_id, u2_cat_risparmi, 'investment', 650, '2025-02-10', 'Versamento risparmio'),
    (user2_id, u2_cat_risparmi, 'investment', 550, '2025-05-15', 'Versamento risparmio');

  -- VACATION - Summer 2024 (Shared Group Expenses)
  INSERT INTO public.transactions (user_id, group_id, paid_by_user_id, category_id, type, amount, date, description, context_id) VALUES
    (user1_id, grp_casa, user1_id, u1_cat_trasporti, 'expense', 350, '2024-08-01', 'Voli A/R Sicilia (2 persone)', ctx1_vacanze),
    (user2_id, grp_casa, user2_id, u1_cat_intrattenimento, 'expense', 900, '2024-08-01', 'Airbnb 1 settimana', ctx2_vacanze),
    (user1_id, grp_casa, user1_id, u1_cat_cena, 'expense', 85, '2024-08-02', 'Cena sul mare', ctx1_vacanze),
    (user2_id, grp_casa, user2_id, grp_cat_supermercato, 'expense', 120, '2024-08-03', 'Spesa vacanza', ctx2_vacanze),
    (user1_id, grp_casa, user1_id, u1_cat_carburante, 'expense', 65, '2024-08-04', 'Noleggio auto', ctx1_vacanze);

  RAISE NOTICE 'Seed completed! Users: %, Groups: 1, Transactions: ~%', 2, (SELECT COUNT(*) FROM public.transactions);

END $$;

-- Verify
SELECT 'Users' as entity, COUNT(*) FROM public.profiles
UNION ALL SELECT 'Groups', COUNT(*) FROM public.groups
UNION ALL SELECT 'Group Members', COUNT(*) FROM public.group_members
UNION ALL SELECT 'Categories', COUNT(*) FROM public.categories
UNION ALL SELECT 'Contexts', COUNT(*) FROM public.contexts
UNION ALL SELECT 'Recurring', COUNT(*) FROM public.recurring_transactions
UNION ALL SELECT 'Transactions', COUNT(*) FROM public.transactions
UNION ALL SELECT 'Budgets', COUNT(*) FROM public.category_budgets;
