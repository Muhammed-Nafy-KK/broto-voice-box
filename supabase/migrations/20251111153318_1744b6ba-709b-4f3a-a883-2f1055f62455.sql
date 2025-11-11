-- Fix infinite recursion by creating proper role-based security
-- Use existing user_role enum instead of creating new one

-- 1. Create user_roles table (separate from profiles to avoid recursion)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 2. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Drop old RLS policies on profiles that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 6. Create new safe RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 7. Drop old RLS policies on complaints
DROP POLICY IF EXISTS "Students can view their own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can view all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Students can create their own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update all complaints" ON public.complaints;

-- 8. Create new safe RLS policies for complaints
CREATE POLICY "Students can view their own complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can create their own complaints"
ON public.complaints
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can update all complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. Drop old RLS policies on activity_logs
DROP POLICY IF EXISTS "Users can view logs for their complaints" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can create logs" ON public.activity_logs;

-- 10. Create new safe RLS policies for activity_logs
CREATE POLICY "Users can view logs for their complaints"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.complaints
    WHERE complaints.id = activity_logs.complaint_id
    AND complaints.student_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = action_by);

-- 11. Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 12. Update handle_new_user function to use user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  
  RETURN NEW;
END;
$$;