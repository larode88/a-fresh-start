# Test Data Documentation

## Overview
This document describes the seed data that has been populated in the database and provides instructions for creating test users.

## Populated Data

### Districts
Three sample districts have been created:
- **Oslo** (ID: d1111111-1111-1111-1111-111111111111)
- **Bergen** (ID: d2222222-2222-2222-2222-222222222222)
- **Trondheim** (ID: d3333333-3333-3333-3333-333333333333)

### Salons
Four sample salons have been created across the districts:

1. **Glamour Hair Oslo**
   - ID: 11111111-1111-1111-1111-111111111111
   - Address: Karl Johans gate 15, Oslo
   - District: Oslo
   - Org Number: 123456789

2. **Style Studio Oslo**
   - ID: 22222222-2222-2222-2222-222222222222
   - Address: Bogstadveien 42, Oslo
   - District: Oslo
   - Org Number: 234567890

3. **Bergen Beauty**
   - ID: 33333333-3333-3333-3333-333333333333
   - Address: Torgallmenningen 8, Bergen
   - District: Bergen
   - Org Number: 345678901

4. **Trondheim Salon**
   - ID: 44444444-4444-4444-4444-444444444444
   - Address: Nordre gate 12, Trondheim
   - District: Trondheim
   - Org Number: 456789012

### Badges
Six achievement badges have been created:
- **Omsetnings-mester**: Achieved 100,000 kr in weekly revenue
- **Merbehandlings-helt**: Achieved 80% addon share
- **Rebooking-stjerne**: Achieved 90% rebooking rate
- **Effektivitets-guru**: Achieved 85% efficiency
- **Første uke**: Registered your first week of data
- **Månedens beste**: Best stylist in salon this month

### Monthly Challenges
Sample challenges for 2025:
- **January**: Focus on addon treatments (75% target)
- **February**: Increase rebooking rate (85% target)
- **March**: Maximize efficiency (80% target)
- **April**: Focus on total revenue (50,000 kr target)

## Creating Test Users

Since users must be authenticated through Supabase Auth, test users need to be created via the signup flow. Here's how to create different types of test users:

### Method 1: Direct Signup (Recommended for Testing)

1. **Navigate to the Signup page** (`/signup`)
2. **Create users with the following pattern:**

#### Admin User
- Email: `admin@test.com`
- Name: `Admin User`
- After signup, manually update in database:
  ```sql
  UPDATE public.users SET role = 'admin' WHERE email = 'admin@test.com';
  INSERT INTO public.user_roles (user_id, role) 
  SELECT id, 'admin'::app_role FROM public.users WHERE email = 'admin@test.com';
  ```

#### District Manager (Oslo)
- Email: `manager.oslo@test.com`
- Name: `Lars Hansen`
- After signup, update:
  ```sql
  UPDATE public.users 
  SET role = 'district_manager', district_id = 'd1111111-1111-1111-1111-111111111111' 
  WHERE email = 'manager.oslo@test.com';
  
  INSERT INTO public.user_roles (user_id, role) 
  SELECT id, 'district_manager'::app_role FROM public.users WHERE email = 'manager.oslo@test.com';
  ```

#### Salon Owner (Glamour Hair Oslo)
- Email: `owner.glamour@test.com`
- Name: `Emma Nilsen`
- After signup, update:
  ```sql
  UPDATE public.users 
  SET role = 'salon_owner', 
      salon_id = '11111111-1111-1111-1111-111111111111',
      district_id = 'd1111111-1111-1111-1111-111111111111'
  WHERE email = 'owner.glamour@test.com';
  
  INSERT INTO public.user_roles (user_id, role) 
  SELECT id, 'salon_owner'::app_role FROM public.users WHERE email = 'owner.glamour@test.com';
  
  UPDATE public.salons 
  SET owner_id = (SELECT id FROM public.users WHERE email = 'owner.glamour@test.com')
  WHERE id = '11111111-1111-1111-1111-111111111111';
  ```

#### Stylist (Glamour Hair Oslo)
- Email: `sofia@test.com`
- Name: `Sofia Andersen`
- After signup, update:
  ```sql
  UPDATE public.users 
  SET role = 'stylist', 
      salon_id = '11111111-1111-1111-1111-111111111111',
      district_id = 'd1111111-1111-1111-1111-111111111111'
  WHERE email = 'sofia@test.com';
  
  INSERT INTO public.user_roles (user_id, role) 
  SELECT id, 'stylist'::app_role FROM public.users WHERE email = 'sofia@test.com';
  ```

#### Apprentice
- Email: `mia@test.com`
- Name: `Mia Halvorsen`
- After signup, update:
  ```sql
  UPDATE public.users 
  SET role = 'apprentice', 
      salon_id = '11111111-1111-1111-1111-111111111111',
      district_id = 'd1111111-1111-1111-1111-111111111111'
  WHERE email = 'mia@test.com';
  
  INSERT INTO public.user_roles (user_id, role) 
  SELECT id, 'apprentice'::app_role FROM public.users WHERE email = 'mia@test.com';
  ```

### Method 2: Using Invitations (Production-like)

For a more realistic setup:

1. **Create admin user** using Method 1
2. **Log in as admin** and navigate to Admin Panel
3. **Create salons** (already done via seed data)
4. **Send invitations** to users with specific roles
5. **Users accept invitations** via the invitation link

## Creating Sample KPI Data

Once you have test users (stylists), you can create sample KPI data using two methods:

### Method 1: Using the Import Feature (Recommended)

1. **Log in as a salon owner or admin**
2. **Navigate to Dashboard** and click the "Import" button
3. **Download the template** Excel file
4. **Fill in the template** with sample data (multiple weeks for multiple stylists)
5. **Upload and import** the file

The import feature will:
- Validate all data
- Match stylists by email
- Create or update KPI entries
- Show detailed progress and error reporting

### Method 2: Direct SQL Insert

If you prefer to insert data directly via SQL:

### Example: Create 4 weeks of KPI data for a stylist

```sql
-- Get stylist ID (replace email with actual test user email)
DO $$
DECLARE
  stylist_uuid UUID;
  salon_uuid UUID;
BEGIN
  SELECT id, salon_id INTO stylist_uuid, salon_uuid 
  FROM public.users 
  WHERE email = 'sofia@test.com';

  -- Week 48 (4 weeks ago)
  INSERT INTO public.weekly_kpi_inputs (
    stylist_id, salon_id, year, week,
    treatment_revenue, retail_revenue, visit_count, visits_with_addon,
    addon_count, rebooked_visits, hours_worked, hours_with_client,
    submitted_by_user_id
  ) VALUES (
    stylist_uuid, salon_uuid, 2024, 48,
    28000, 4500, 45, 32,
    38, 36, 40, 35,
    stylist_uuid
  );

  -- Week 49 (3 weeks ago)
  INSERT INTO public.weekly_kpi_inputs (
    stylist_uuid, salon_uuid, 2024, 49,
    32000, 5200, 52, 38,
    42, 44, 40, 36,
    stylist_uuid
  ) VALUES (
    stylist_uuid, salon_uuid, 2024, 49,
    32000, 5200, 52, 38,
    42, 44, 40, 36,
    stylist_uuid
  );

  -- Week 50 (2 weeks ago)
  INSERT INTO public.weekly_kpi_inputs (
    stylist_uuid, salon_uuid, 2024, 50,
    35000, 6100, 58, 44,
    48, 50, 40, 37,
    stylist_uuid
  ) VALUES (
    stylist_uuid, salon_uuid, 2024, 50,
    35000, 6100, 58, 44,
    48, 50, 40, 37,
    stylist_uuid
  );

  -- Week 51 (last week)
  INSERT INTO public.weekly_kpi_inputs (
    stylist_uuid, salon_uuid, 2024, 51,
    38000, 6800, 62, 48,
    52, 54, 40, 38,
    stylist_uuid
  ) VALUES (
    stylist_uuid, salon_uuid, 2024, 51,
    38000, 6800, 62, 48,
    52, 54, 40, 38,
    stylist_uuid
  );
END $$;
```

## Quick Start Test Scenario

1. **Create 3 test users via signup:**
   - Admin: `admin@test.com`
   - Salon Owner: `owner@test.com`
   - Stylist: `stylist@test.com`

2. **Run SQL to set up roles:**
   ```sql
   -- Admin
   UPDATE public.users SET role = 'admin' WHERE email = 'admin@test.com';
   INSERT INTO public.user_roles (user_id, role) 
   SELECT id, 'admin'::app_role FROM public.users WHERE email = 'admin@test.com';

   -- Salon Owner
   UPDATE public.users 
   SET role = 'salon_owner', 
       salon_id = '11111111-1111-1111-1111-111111111111',
       district_id = 'd1111111-1111-1111-1111-111111111111'
   WHERE email = 'owner@test.com';
   INSERT INTO public.user_roles (user_id, role) 
   SELECT id, 'salon_owner'::app_role FROM public.users WHERE email = 'owner@test.com';

   -- Stylist
   UPDATE public.users 
   SET role = 'stylist', 
       salon_id = '11111111-1111-1111-1111-111111111111',
       district_id = 'd1111111-1111-1111-1111-111111111111'
   WHERE email = 'stylist@test.com';
   INSERT INTO public.user_roles (user_id, role) 
   SELECT id, 'stylist'::app_role FROM public.users WHERE email = 'stylist@test.com';
   ```

3. **Log in as stylist** and register weekly KPI data via the app

4. **Log in as salon owner** to view team dashboard

5. **Log in as admin** to manage everything

## Notes

- All test users should use passwords like `Test1234!` for easy testing
- Supabase auth is configured with auto-confirm for development
- The `handle_new_user()` trigger automatically creates entries in `public.users` when users sign up
- Weekly KPI inputs automatically generate calculated KPIs via database trigger
