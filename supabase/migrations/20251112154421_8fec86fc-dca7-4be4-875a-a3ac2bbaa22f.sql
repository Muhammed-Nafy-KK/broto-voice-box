-- Enable realtime for complaints table
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;

-- Enable realtime for announcements table
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- Enable realtime for activity_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;