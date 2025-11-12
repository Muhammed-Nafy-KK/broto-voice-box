import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Setup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const { toast } = useToast();

  const createAdminAccount = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin');
      
      if (error) throw error;

      setAdminCreated(true);
      toast({
        title: "Admin Account Created",
        description: `Email: ${data.email}\nPassword: ${data.password}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>System Setup</CardTitle>
          <CardDescription>
            Initialize the admin account for the complaint management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!adminCreated ? (
            <>
              <p className="text-sm text-muted-foreground">
                Click the button below to create the default admin account.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Admin Credentials:</p>
                <p className="text-sm font-mono">Email: admin@complaint-system.com</p>
                <p className="text-sm font-mono">Password: Admin@123</p>
              </div>
              <Button 
                onClick={createAdminAccount} 
                disabled={isCreating}
                className="w-full"
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Admin Account
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-primary mb-2">✓ Admin account created successfully!</p>
                <p className="text-sm text-muted-foreground">
                  You can now login with the credentials shown above.
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
