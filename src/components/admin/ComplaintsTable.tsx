import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Complaint = Database["public"]["Tables"]["complaints"]["Row"];

interface ComplaintsTableProps {
  complaints: Complaint[];
  onComplaintClick: (complaint: Complaint) => void;
}

export const ComplaintsTable = ({ complaints, onComplaintClick }: ComplaintsTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {complaints.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No complaints found
              </TableCell>
            </TableRow>
          ) : (
            complaints.map((complaint) => (
              <TableRow
                key={complaint.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onComplaintClick(complaint)}
              >
                <TableCell className="font-mono text-xs">
                  {complaint.complaint_id}
                </TableCell>
                <TableCell className="font-medium max-w-xs truncate">
                  {complaint.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {complaint.category}
                  </Badge>
                </TableCell>
                <TableCell>{complaint.student_name}</TableCell>
                <TableCell>
                  <StatusBadge status={complaint.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(complaint.created_at), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(complaint.updated_at), "MMM dd, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
