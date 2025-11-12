import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useRealtimeNotifications = (userId: string, userRole: 'student' | 'admin') => {
  useEffect(() => {
    if (!userId) return;

    const channels: any[] = [];

    // Listen for complaint updates (for students)
    if (userRole === 'student') {
      const complaintChannel = supabase
        .channel('complaint-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'complaints',
            filter: `student_id=eq.${userId}`,
          },
          (payload: any) => {
            const newComplaint = payload.new;
            const oldComplaint = payload.old;
            
            if (newComplaint.status !== oldComplaint.status) {
              toast.success(`Complaint "${newComplaint.title}" status updated to ${newComplaint.status}`, {
                description: newComplaint.admin_remarks || 'Check your complaint for details',
              });
            } else if (newComplaint.admin_remarks !== oldComplaint.admin_remarks && newComplaint.admin_remarks) {
              toast.info(`Admin replied to "${newComplaint.title}"`, {
                description: newComplaint.admin_remarks.substring(0, 100) + '...',
              });
            }
          }
        )
        .subscribe();
      
      channels.push(complaintChannel);

      // Listen for new activity logs
      const activityChannel = supabase
        .channel('activity-logs')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs',
          },
          async (payload: any) => {
            const activity = payload.new;
            
            // Check if this activity is for user's complaint
            const { data: complaint } = await supabase
              .from('complaints')
              .select('title, student_id')
              .eq('id', activity.complaint_id)
              .single();
            
            if (complaint && complaint.student_id === userId) {
              toast.info('New update on your complaint', {
                description: activity.message,
              });
            }
          }
        )
        .subscribe();
      
      channels.push(activityChannel);
    }

    // Listen for new announcements (for all users)
    const announcementChannel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        (payload: any) => {
          const announcement = payload.new;
          if (announcement.is_active) {
            toast.info(`📢 ${announcement.title}`, {
              description: announcement.message,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();
    
    channels.push(announcementChannel);

    // Listen for new complaints (for admins)
    if (userRole === 'admin') {
      const newComplaintChannel = supabase
        .channel('new-complaints')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'complaints',
          },
          (payload: any) => {
            const complaint = payload.new;
            toast.info(`New complaint: ${complaint.title}`, {
              description: `From ${complaint.student_name} - ${complaint.category}`,
              duration: 5000,
            });
          }
        )
        .subscribe();
      
      channels.push(newComplaintChannel);
    }

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [userId, userRole]);
};
