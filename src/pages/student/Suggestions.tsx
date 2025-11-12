import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ThumbsUp, Lightbulb } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  status: string;
  upvotes: number;
  created_at: string;
  student_name: string;
}

const StudentSuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    const { data, error } = await supabase
      .from('suggestions' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSuggestions(data as any);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user?.id)
      .single();

    const { error } = await supabase
      .from('suggestions' as any)
      .insert({
        title,
        description,
        student_id: user?.id,
        student_name: profile?.full_name || 'Unknown',
      } as any);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit suggestion",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Suggestion submitted successfully",
      });
      setTitle("");
      setDescription("");
      fetchSuggestions();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'secondary',
      under_review: 'default',
      approved: 'default',
      archived: 'secondary'
    };
    return colors[status] || 'secondary';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Suggestions & Feedback</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Submit a Suggestion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Suggestion Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Describe your suggestion or feedback in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
            <Button onClick={handleSubmit} disabled={isLoading}>
              Submit Suggestion
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">All Suggestions</h2>
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      by {suggestion.student_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(suggestion.status) as any}>
                      {suggestion.status.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{suggestion.upvotes}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{suggestion.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentSuggestions;
