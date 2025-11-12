-- Create notification logs table for tracking email and SMS delivery
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  related_complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  related_announcement_id UUID REFERENCES public.announcements(id) ON DELETE SET NULL,
  sent_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all notification logs
CREATE POLICY "Admins can view all notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- System can insert notification logs (via service role in edge functions)
CREATE POLICY "Service role can insert logs"
  ON public.notification_logs
  FOR INSERT
  WITH CHECK (true);

-- Admins can update notification logs (for resend functionality)
CREATE POLICY "Admins can update notification logs"
  ON public.notification_logs
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create index for faster queries
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_type ON public.notification_logs(notification_type);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_complaint_id ON public.notification_logs(related_complaint_id);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_logs_updated_at
  BEFORE UPDATE ON public.notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();