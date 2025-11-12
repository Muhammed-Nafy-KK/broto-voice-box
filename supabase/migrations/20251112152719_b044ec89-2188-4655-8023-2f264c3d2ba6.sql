-- Add priority and tags to complaints table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_category text,
ADD COLUMN IF NOT EXISTS ai_sentiment text,
ADD COLUMN IF NOT EXISTS marked_urgent boolean DEFAULT false;

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcements
CREATE POLICY "Everyone can view active announcements"
ON public.announcements
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update announcements"
ON public.announcements
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete announcements"
ON public.announcements
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create suggestions table
CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  student_id uuid REFERENCES auth.users(id) NOT NULL,
  student_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'archived')),
  upvotes integer DEFAULT 0,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on suggestions
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for suggestions
CREATE POLICY "Students can view all suggestions"
ON public.suggestions
FOR SELECT
USING (public.has_role(auth.uid(), 'student') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can create their own suggestions"
ON public.suggestions
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own suggestions"
ON public.suggestions
FOR UPDATE
USING (auth.uid() = student_id);

CREATE POLICY "Admins can update all suggestions"
ON public.suggestions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for suggestions updated_at
CREATE TRIGGER update_suggestions_updated_at
BEFORE UPDATE ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_tags ON public.complaints USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.suggestions(status);
