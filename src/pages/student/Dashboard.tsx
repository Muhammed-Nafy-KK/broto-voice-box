import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ComplaintCard } from "@/components/student/ComplaintCard";
import { AnnouncementBanner } from "@/components/student/AnnouncementBanner";
import { Database } from "@/integrations/supabase/types";
import { Plus, LogOut, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

type Complaint = Database["public"]["Tables"]["complaints"]["Row"];

const Dashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const navigate = useNavigate();

  useRealtimeNotifications(userId, 'student');

  useEffect(() => {
    fetchComplaints();

    // Subscribe to realtime updates for complaints
    const complaintChannel = supabase
      .channel('complaint-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter: `student_id=eq.${userId}`,
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(complaintChannel);
    };
  }, [userId]);

  const fetchComplaints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
      }

      // Fetch complaints
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">BrotoRaise</h1>
            <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <AnnouncementBanner />
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">My Complaints</h2>
            <p className="text-sm text-muted-foreground">
              {complaints.length} {complaints.length === 1 ? "complaint" : "complaints"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/student/suggestions")}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Suggestions
            </Button>
            <Button onClick={() => navigate("/student/create-complaint")}>
              <Plus className="h-4 w-4 mr-2" />
              New Complaint
            </Button>
          </div>
        </div>

        {complaints.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No complaints yet</p>
            <Button onClick={() => navigate("/student/create-complaint")}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Your First Complaint
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {complaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onClick={() => navigate(`/student/complaint/${complaint.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
