import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/integrations/supabase/types";
import { Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Complaint = Database["public"]["Tables"]["complaints"]["Row"];
type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];

interface ComplaintDialogProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  adminId: string;
}

export const ComplaintDialog = ({
  complaint,
  isOpen,
  onClose,
  onUpdate,
  adminId,
}: ComplaintDialogProps) => {
  const [status, setStatus] = useState<ComplaintStatus>(complaint?.status || "Pending");
  const [adminRemarks, setAdminRemarks] = useState(complaint?.admin_remarks || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    if (!complaint) return;

    try {
      setIsLoading(true);

      const updates: any = {};
      let logMessage = "";

      if (status !== complaint.status) {
        updates.status = status;
        logMessage = `Status updated to ${status}`;
      }

      if (adminRemarks !== complaint.admin_remarks) {
        updates.admin_remarks = adminRemarks;
        if (logMessage) {
          logMessage += " and admin remarks added";
        } else {
          logMessage = "Admin remarks added";
        }
      }

      if (Object.keys(updates).length === 0) {
        toast.error("No changes to update");
        return;
      }

      const { error: updateError } = await supabase
        .from("complaints")
        .update(updates)
        .eq("id", complaint.id);

      if (updateError) throw updateError;

      // Create activity log
      await supabase.from("activity_logs").insert({
        complaint_id: complaint.id,
        action_by: adminId,
        action_type: "Status Update",
        message: logMessage,
      });

      toast.success("Complaint updated successfully!");
      onUpdate();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!complaint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground font-mono">
                  {complaint.complaint_id}
                </span>
                <Badge variant="outline">{complaint.category}</Badge>
              </div>
              <DialogTitle className="text-xl">{complaint.title}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(complaint.created_at), "MMM dd, yyyy 'at' HH:mm")}
                  </span>
                </div>
                <span>By {complaint.student_name}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
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

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ComplaintStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Admin Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Add your response or resolution notes..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Complaint"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
