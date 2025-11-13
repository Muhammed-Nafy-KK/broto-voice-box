-- Add phone_number field to profiles table
ALTER TABLE public.profiles
ADD COLUMN phone_number text;

-- Add an index for faster lookups
CREATE INDEX idx_profiles_phone_number ON public.profiles(phone_number);