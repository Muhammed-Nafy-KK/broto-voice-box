import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];

interface StatusBadgeProps {
  status: ComplaintStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusVariant = (status: ComplaintStatus) => {
    switch (status) {
      case "Pending":
        return "secondary";
      case "In Review":
        return "default";
      case "Resolved":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
      case "Pending":
        return "bg-muted text-muted-foreground hover:bg-muted";
      case "In Review":
        return "bg-warning text-warning-foreground hover:bg-warning/90";
      case "Resolved":
        return "bg-success text-success-foreground hover:bg-success/90";
      default:
        return "";
    }
  };

  return (
    <Badge variant={getStatusVariant(status)} className={getStatusColor(status)}>
      {status}
    </Badge>
  );
};
