import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/integrations/supabase/types";
import { ArrowLeft, Calendar, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Complaint = Database["public"]["Tables"]["complaints"]["Row"];
type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];

const ComplaintDetail = () => {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchComplaintDetails();
    }
  }, [id]);

  const fetchComplaintDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch complaint
      const { data: complaintData, error: complaintError } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", id!)
        .eq("student_id", user.id)
        .single();

      if (complaintError) throw complaintError;
      setComplaint(complaintData);

      // Fetch activity logs
      const { data: logsData, error: logsError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("complaint_id", id!)
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;
      setActivityLogs(logsData || []);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
      navigate("/student/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!complaint) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/student/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground font-mono">
                    {complaint.complaint_id}
                  </span>
                  <Badge variant="outline">{complaint.category}</Badge>
                </div>
                <CardTitle className="text-2xl mb-2">{complaint.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(complaint.created_at), "MMM dd, yyyy 'at' HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
              <StatusBadge status={complaint.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>

            {complaint.attachment_url && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Attachment
                </h3>
                <a
                  href={complaint.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Attachment
                </a>
              </div>
            )}

            {complaint.admin_remarks && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Admin Response
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {complaint.admin_remarks}
                    </p>
                  </div>
                </div>
              </>
            )}

            {activityLogs.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Activity Timeline</h3>
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="text-sm">{log.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM dd, yyyy 'at' HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ComplaintDetail;
