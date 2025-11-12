import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  message: string;
}

export const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements' as any)
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) {
      setAnnouncements(data as any);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed([...dismissed, id]);
  };

  const visibleAnnouncements = announcements.filter(a => !dismissed.includes(a.id));

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAnnouncements.map((announcement) => (
        <Card key={announcement.id} className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <Megaphone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{announcement.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{announcement.message}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleDismiss(announcement.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
