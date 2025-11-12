import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreateComplaintForm } from "@/components/student/CreateComplaintForm";
import { ArrowLeft } from "lucide-react";

const CreateComplaint = () => {
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserId(user.id);
        setUserName(profile.full_name);
      }
      setIsLoading(false);
    };

    fetchUser();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card shadow-md">
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/student/dashboard")}
            className="hover:bg-secondary transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <CreateComplaintForm userId={userId} userName={userName} />
      </main>
    </div>
  );
};

export default CreateComplaint;
