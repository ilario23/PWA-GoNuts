-- ============================================================================
-- SEED DATA SCRIPT (REALISTIC GENERATOR) - FIXED
-- ============================================================================

-- 1. CLEANUP
-- TRUNCATE TABLES (Clean slate)
TRUNCATE public.transactions, public.recurring_transactions, public.category_budgets, public.categories, public.contexts, public.group_members, public.groups, public.user_settings, public.profiles CASCADE;
-- DELETE FROM auth.users; -- Optional: Uncomment if you want to wipe users too (requires privs)

-- 2. HELPER FUNCTION (Created temporarily for the seed)
CREATE OR REPLACE FUNCTION public.seed_create_cat(
    p_uid uuid, 
    p_gid uuid, 
    p_pid uuid, 
    p_nm text, 
    p_icn text, 
    p_col text, 
    p_typ text, 
    p_act boolean DEFAULT true
) RETURNS uuid AS $$
DECLARE
    v_new_id uuid := uuid_generate_v4();
BEGIN
    INSERT INTO public.categories (id, user_id, group_id, parent_id, name, icon, color, type, active)
    VALUES (v_new_id, p_uid, p_gid, p_pid, p_nm, p_icn, p_col, p_typ, p_act);
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- 3. MAIN SEED LOGIC
DO $$
DECLARE
  -- ==========================================================================
  -- CONFIGURATION MATCHING YOUR APP
  -- ==========================================================================
  -- Replace these with your actual Supabase User UUIDs if running against real Auth
  user_a_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- CHANGE ME TO YOUR ID
  user_b_id uuid := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'; -- CHANGE ME TO SECOND USER ID (or keep as placeholder)

  -- Names for Guests
  guest_name text := 'Guest Charlie';

  -- Group IDs
  group_main_id uuid := uuid_generate_v4();    -- User A + User B
  group_guest_id uuid := uuid_generate_v4();   -- User A + Guest

  -- Member IDs
  mem_a_main uuid := uuid_generate_v4();
  mem_b_main uuid := uuid_generate_v4();
  
  mem_a_guest uuid := uuid_generate_v4();
  mem_charlie_guest uuid := uuid_generate_v4();

  -- Category Standard Colors
  c_exp text := '#EF4444'; -- Red
  c_inc text := '#10B981'; -- Green
  c_inv text := '#8B5CF6'; -- Purple
  c_blue text := '#3B82F6';
  c_orange text := '#F59E0B';
  c_slate text := '#64748B';

  -- Time variables
  start_date date := CURRENT_DATE - INTERVAL '2 years';
  end_date date := CURRENT_DATE;
  curr_date date;
  
  -- Iterators
  i int;
  t int;
  
  -- Temp variables for generation
  tmp_cat_id uuid;
  tmp_amount numeric;
  tmp_desc text;
  
  -- Category Storage (We store some key IDs to use in transactions)
  -- Arrays of IDs for random selection
  cats_a_food uuid[];
  cats_a_trans uuid[];
  cats_a_shop uuid[];
  cats_a_bills uuid[];
  cats_b_gen uuid[];
  cats_grp_main uuid[];
  cats_grp_guest uuid[];
  
  cat_id_salary uuid;
  
  -- Hierarchies vars
  p_trans uuid;
  p_car uuid;
  p_moto uuid;
  p_house uuid;
  p_shop uuid;
  p_food uuid;
  p_misc uuid;
  c_tmp uuid;

BEGIN
  -- ==========================================================================
  -- 1. ENSURE USERS EXIST (Mock Insert for FK satisfaction if checking local)
  -- ==========================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_a_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (user_a_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user_a@example.com', 'hash', now(), '{"full_name": "User A", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=A"}');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_b_id) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (user_b_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user_b@example.com', 'hash', now(), '{"full_name": "User B", "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=B"}');
  END IF;

  -- Settings
  INSERT INTO public.user_settings (user_id, currency, language) VALUES (user_a_id, 'EUR', 'it') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_settings (user_id, currency, language) VALUES (user_b_id, 'USD', 'en') ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- 2. CREATE GROUPS AND MEMBERS
  -- ==========================================================================
  -- Group 1: Couple/House (A + B)
  INSERT INTO public.groups (id, name, description, created_by) 
  VALUES (group_main_id, 'Casa & Spese', 'Spese condivise tra A e B', user_a_id);
  
  INSERT INTO public.group_members (id, group_id, user_id, share) VALUES
  (mem_a_main, group_main_id, user_a_id, 50.00),
  (mem_b_main, group_main_id, user_b_id, 50.00);

  -- Group 2: Trip with Guest (A + Guest)
  INSERT INTO public.groups (id, name, description, created_by) 
  VALUES (group_guest_id, 'Viaggio con Charlie', 'Costi viaggio 2024', user_a_id);
  
  INSERT INTO public.group_members (id, group_id, user_id, guest_name, is_guest, share) VALUES
  (mem_a_guest, group_guest_id, user_a_id, NULL, false, 50.00),
  (mem_charlie_guest, group_guest_id, NULL, guest_name, true, 50.00);

  -- ==========================================================================
  -- ==========================================================================
  -- 2.1 CREATE CONTEXTS (NEW)
  -- ==========================================================================
  
  DECLARE 
     ctx_work_id uuid := uuid_generate_v4();
     ctx_vac_id uuid := uuid_generate_v4();
  BEGIN
     -- Insert with known IDs
     INSERT INTO public.contexts (id, user_id, name, description, active) VALUES
     (ctx_work_id, user_a_id, 'Lavoro', 'Spese rimborsabili o legate al lavoro', true),
     (ctx_vac_id, user_a_id, 'Vacanza', 'Viaggi e relax', true);

  -- ==========================================================================
  -- 3. CREATE CATEGORIES (HIERARCHY & VOLUME)
  -- ==========================================================================
  
  -- USER A CATEGORIES --------------------------------------------------------
  -- Transport Hierarchy
  p_trans := seed_create_cat(user_a_id, NULL, NULL, 'Trasporti', 'Car', c_blue, 'expense');
    -- Car Sub-tree
    p_car := seed_create_cat(user_a_id, NULL, p_trans, 'Auto', 'Car', c_blue, 'expense');
      c_tmp := seed_create_cat(user_a_id, NULL, p_car, 'Carburante Auto', 'Fuel', c_blue, 'expense'); cats_a_trans := array_append(cats_a_trans, c_tmp);
      c_tmp := seed_create_cat(user_a_id, NULL, p_car, 'Manutenzione Auto', 'Wrench', c_orange, 'expense'); cats_a_trans := array_append(cats_a_trans, c_tmp);
      c_tmp := seed_create_cat(user_a_id, NULL, p_car, 'Assicurazione', 'ShieldCheck', c_slate, 'expense'); cats_a_bills := array_append(cats_a_bills, c_tmp);
    
    -- Moto Sub-tree
    p_moto := seed_create_cat(user_a_id, NULL, p_trans, 'Moto', 'Trophy', c_blue, 'expense');
      c_tmp := seed_create_cat(user_a_id, NULL, p_moto, 'Carburante Moto', 'Fuel', c_blue, 'expense'); cats_a_trans := array_append(cats_a_trans, c_tmp);
      c_tmp := seed_create_cat(user_a_id, NULL, p_moto, 'Manutenzione Moto', 'Wrench', c_orange, 'expense'); cats_a_trans := array_append(cats_a_trans, c_tmp);
    
    -- Public
    c_tmp := seed_create_cat(user_a_id, NULL, p_trans, 'Mezzi Pubblici', 'Bus', c_blue, 'expense'); cats_a_trans := array_append(cats_a_trans, c_tmp);
    
  -- Housing Hierarchy
  p_house := seed_create_cat(user_a_id, NULL, NULL, 'Casa', 'Home', c_slate, 'expense');
    c_tmp := seed_create_cat(user_a_id, NULL, p_house, 'Affitto', 'Key', c_exp, 'expense'); cats_a_bills := array_append(cats_a_bills, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_house, 'Bollette', 'Lightbulb', c_orange, 'expense'); cats_a_bills := array_append(cats_a_bills, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_house, 'Internet', 'Wifi', c_blue, 'expense'); cats_a_bills := array_append(cats_a_bills, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_house, 'Riparazioni', 'Hammer', c_orange, 'expense');
    -- Inactive
    PERFORM seed_create_cat(user_a_id, NULL, p_house, 'Vecchia Casa', 'Trash', c_slate, 'expense', false);

  -- Food Hierarchy
  p_food := seed_create_cat(user_a_id, NULL, NULL, 'Cibo & Drink', 'Utensils', c_exp, 'expense');
    c_tmp := seed_create_cat(user_a_id, NULL, p_food, 'Spesa', 'ShoppingCart', c_inc, 'expense'); cats_a_food := array_append(cats_a_food, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_food, 'Ristoranti', 'UtensilsCrossed', c_exp, 'expense'); cats_a_food := array_append(cats_a_food, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_food, 'Bar & Caffè', 'Coffee', c_orange, 'expense'); cats_a_food := array_append(cats_a_food, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_food, 'Delivery', 'Truck', c_slate, 'expense'); cats_a_food := array_append(cats_a_food, c_tmp);

  -- Shopping Hierarchy
  p_shop := seed_create_cat(user_a_id, NULL, NULL, 'Shopping', 'ShoppingBag', c_inv, 'expense');
    c_tmp := seed_create_cat(user_a_id, NULL, p_shop, 'Abbigliamento', 'Shirt', c_inv, 'expense'); cats_a_shop := array_append(cats_a_shop, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_shop, 'Elettronica', 'Monitor', c_slate, 'expense'); cats_a_shop := array_append(cats_a_shop, c_tmp);
    c_tmp := seed_create_cat(user_a_id, NULL, p_shop, 'Hobby', 'Gamepad2', c_inv, 'expense'); cats_a_shop := array_append(cats_a_shop, c_tmp);
    
  -- Income
  cat_id_salary := seed_create_cat(user_a_id, NULL, NULL, 'Stipendio', 'Wallet', c_inc, 'income');
  PERFORM seed_create_cat(user_a_id, NULL, NULL, 'Extra', 'Banknote', c_inc, 'income');
  
  -- Other
  PERFORM seed_create_cat(user_a_id, NULL, NULL, 'Salute', 'Heart', c_exp, 'expense');
  PERFORM seed_create_cat(user_a_id, NULL, NULL, 'Viaggi', 'Plane', c_blue, 'expense');
  
  -- USER B CATEGORIES (Simpler subset) ---------------------------------------
  p_misc := seed_create_cat(user_b_id, NULL, NULL, 'Generale', 'Box', c_slate, 'expense');
  cats_b_gen := array_append(cats_b_gen, seed_create_cat(user_b_id, NULL, p_misc, 'Spese Varie', 'CreditCard', c_exp, 'expense'));
  cats_b_gen := array_append(cats_b_gen, seed_create_cat(user_b_id, NULL, p_misc, 'Uscite', 'Beer', c_orange, 'expense'));
  cats_b_gen := array_append(cats_b_gen, seed_create_cat(user_b_id, NULL, NULL, 'Affitto', 'Home', c_blue, 'expense'));


  -- GROUP CATEGORIES ---------------------------------------------------------
  -- Group Main
  cats_grp_main := array_append(cats_grp_main, seed_create_cat(user_a_id, group_main_id, NULL, 'Affitto Casa', 'Home', c_exp, 'expense'));
  cats_grp_main := array_append(cats_grp_main, seed_create_cat(user_a_id, group_main_id, NULL, 'Spesa Comune', 'ShoppingCart', c_inc, 'expense'));
  cats_grp_main := array_append(cats_grp_main, seed_create_cat(user_a_id, group_main_id, NULL, 'Bollette', 'Zap', c_orange, 'expense'));

  -- Group Guest
  cats_grp_guest := array_append(cats_grp_guest, seed_create_cat(user_a_id, group_guest_id, NULL, 'Alloggio', 'Bed', c_blue, 'expense'));
  cats_grp_guest := array_append(cats_grp_guest, seed_create_cat(user_a_id, group_guest_id, NULL, 'Cene Fuori', 'Utensils', c_exp, 'expense'));


  -- ==========================================================================
  -- 4. RECURRING TRANSACTIONS
  -- ==========================================================================
  -- User A: Netflix
  INSERT INTO public.recurring_transactions (user_id, group_id, paid_by_member_id, type, category_id, amount, description, frequency, start_date)
  VALUES (user_a_id, NULL, NULL, 'expense', cats_a_bills[3], 15.99, 'Netflix', 'monthly', start_date);
  
  -- Group Main: Rent (Paid by A)
  INSERT INTO public.recurring_transactions (user_id, group_id, paid_by_member_id, type, category_id, amount, description, frequency, start_date)
  VALUES (user_a_id, group_main_id, mem_a_main, 'expense', cats_grp_main[1], 1200.00, 'Affitto Mensile', 'monthly', start_date);

  -- ==========================================================================
  -- 5. GENERATE TRANSACTIONS (2 Years)
  -- ==========================================================================
  
  curr_date := start_date;
  WHILE curr_date <= end_date LOOP
    
    -- ------------------------------------------------------------------------
    -- USER A TRANSACTIONS FOR TODAY
    -- ------------------------------------------------------------------------
    t := floor(random() * 5); -- 0-4
    FOR i IN 1..t LOOP
       DECLARE
         rnd float := random();
         tmp_rnd_idx int;
         tmp_ctx_id uuid; -- Variable for context
       BEGIN
         tmp_ctx_id := NULL; -- Reset context

         IF rnd < 0.20 THEN
           -- Group Main (20%)
           tmp_amount := (random() * 80 + 10)::numeric(10,2);
           tmp_rnd_idx := floor(random() * array_length(cats_grp_main, 1) + 1);
           tmp_cat_id := cats_grp_main[tmp_rnd_idx];
           
           INSERT INTO public.transactions (user_id, group_id, paid_by_member_id, category_id, type, amount, date, description)
           VALUES (user_a_id, group_main_id, mem_a_main, tmp_cat_id, 'expense', tmp_amount, curr_date, 'Spesa gruppo ' || curr_date);
           
         ELSIF rnd < 0.25 THEN
           -- Group Guest (5%) - Mostly Holiday context
           tmp_amount := (random() * 50 + 20)::numeric(10,2);
           tmp_rnd_idx := floor(random() * array_length(cats_grp_guest, 1) + 1);
           tmp_cat_id := cats_grp_guest[tmp_rnd_idx];
           
           -- 90% chance of being "Vacation" context
           IF random() < 0.9 THEN
              tmp_ctx_id := ctx_vac_id;
           END IF;
           
           IF random() < 0.5 THEN
              -- Paid by A
              INSERT INTO public.transactions (user_id, group_id, paid_by_member_id, category_id, context_id, type, amount, date, description)
              VALUES (user_a_id, group_guest_id, mem_a_guest, tmp_cat_id, tmp_ctx_id, 'expense', tmp_amount, curr_date, 'Cena fuori');
           ELSE
              -- Paid by Guest
              INSERT INTO public.transactions (user_id, group_id, paid_by_member_id, category_id, context_id, type, amount, date, description)
              VALUES (user_a_id, group_guest_id, mem_charlie_guest, tmp_cat_id, tmp_ctx_id, 'expense', tmp_amount, curr_date, 'Pagato da Ospite');
           END IF;
           
         ELSE
           -- Personal (75%)
           rnd := random();
           IF rnd < 0.4 THEN
             -- Food
             tmp_rnd_idx := floor(random() * array_length(cats_a_food, 1) + 1);
             tmp_cat_id := cats_a_food[tmp_rnd_idx];
             tmp_amount := (random() * 30 + 5)::numeric(10,2);
             tmp_desc := 'Cibo ' || curr_date;
             
             -- Randomly assign Work context (e.g. 20% of food is work lunch)
             IF random() < 0.2 THEN
                tmp_ctx_id := ctx_work_id;
                tmp_desc := 'Pranzo Lavoro ' || curr_date;
             END IF;
             
           ELSIF rnd < 0.7 THEN
             -- Transport
             tmp_rnd_idx := floor(random() * array_length(cats_a_trans, 1) + 1);
             tmp_cat_id := cats_a_trans[tmp_rnd_idx];
             tmp_amount := (random() * 60 + 20)::numeric(10,2);
             tmp_desc := 'Trasporto';
             
             -- Randomly assign Work context (e.g. 30% of transport is work travel)
             IF random() < 0.3 THEN
                tmp_ctx_id := ctx_work_id;
                tmp_desc := 'Trasferta Lavoro';
             END IF;
             
           ELSE
             -- Shop
             tmp_rnd_idx := floor(random() * array_length(cats_a_shop, 1) + 1);
             tmp_cat_id := cats_a_shop[tmp_rnd_idx];
             tmp_amount := (random() * 150 + 20)::numeric(10,2);
             tmp_desc := 'Acquisto';
             
             -- Maybe 5% vacation shopping
             IF random() < 0.05 THEN
                tmp_ctx_id := ctx_vac_id;
                tmp_desc := 'Souvenir Vacanza';
             END IF;
             
           END IF;
           
           INSERT INTO public.transactions (user_id, group_id, paid_by_member_id, category_id, context_id, type, amount, date, description)
           VALUES (user_a_id, NULL, NULL, tmp_cat_id, tmp_ctx_id, 'expense', tmp_amount, curr_date, tmp_desc);
         END IF;
       END;
    END LOOP;
    
    -- Salary
    IF EXTRACT(DAY FROM curr_date) = 27 THEN
       INSERT INTO public.transactions (user_id, category_id, type, amount, date, description) 
       VALUES (user_a_id, cat_id_salary, 'income', 2800.00, curr_date, 'Stipendio Mese');
    END IF;

    -- ------------------------------------------------------------------------
    -- USER B TRANSACTIONS FOR TODAY
    -- ------------------------------------------------------------------------
    t := floor(random() * 4); -- 0-3
    FOR i IN 1..t LOOP
       DECLARE
          tmp_rnd_idx int;
       BEGIN
          tmp_rnd_idx := floor(random() * array_length(cats_b_gen, 1) + 1);
          tmp_cat_id := cats_b_gen[tmp_rnd_idx];
          tmp_amount := (random() * 100 + 10)::numeric(10,2);
          
          IF random() < 0.15 THEN
             tmp_rnd_idx := floor(random() * array_length(cats_grp_main, 1) + 1);
             tmp_cat_id := cats_grp_main[tmp_rnd_idx];
             
             INSERT INTO public.transactions (user_id, group_id, paid_by_member_id, category_id, type, amount, date, description)
             VALUES (user_b_id, group_main_id, mem_b_main, tmp_cat_id, 'expense', tmp_amount, curr_date, 'Spesa B per casa');
          ELSE
             INSERT INTO public.transactions (user_id, group_id, paid_by_member_id, category_id, type, amount, date, description)
             VALUES (user_b_id, NULL, NULL, tmp_cat_id, 'expense', tmp_amount, curr_date, 'Spesa Personale B');
          END IF;
       END;
    END LOOP;

    curr_date := curr_date + 1;
  END LOOP;
  END; -- End of the DECLARE block for context vars
  
  RAISE NOTICE 'Seed Data Generation Completed Successfully.';
END $$;

-- 4. CLEANUP FUNCTION
DROP FUNCTION IF EXISTS public.seed_create_cat;
