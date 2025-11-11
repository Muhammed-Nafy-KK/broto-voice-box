import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { FileText } from "lucide-react";

type Complaint = Database["public"]["Tables"]["complaints"]["Row"];

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: () => void;
}

export const ComplaintCard = ({ complaint, onClick }: ComplaintCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">
                {complaint.complaint_id}
              </span>
              <Badge variant="outline" className="text-xs">
                {complaint.category}
              </Badge>
            </div>
            <h3 className="font-semibold line-clamp-2">{complaint.title}</h3>
          </div>
          <StatusBadge status={complaint.status} />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {complaint.description}
        </p>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
        </span>
        {complaint.attachment_url && (
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>Attachment</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
