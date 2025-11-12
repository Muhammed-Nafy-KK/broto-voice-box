import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Search, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface NotificationLog {
  id: string;
  notification_type: string;
  recipient: string;
  subject: string | null;
  content: string;
  status: string;
  error_message: string | null;
  metadata: any;
  related_complaint_id: string | null;
  related_announcement_id: string | null;
  created_at: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
    
    // Set up realtime subscription
    const channel = supabase
      .channel("notification_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_logs",
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, typeFilter, statusFilter, searchQuery]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to fetch notification logs");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (typeFilter !== "all") {
      filtered = filtered.filter((log) => log.notification_type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const handleResend = async (log: NotificationLog) => {
    setResendingId(log.id);
    
    try {
      if (log.notification_type === "email") {
        if (log.related_complaint_id) {
          // Fetch complaint details to resend
          const { data: complaint, error } = await supabase
            .from("complaints")
            .select("*, profiles!complaints_student_id_fkey(email, full_name)")
            .eq("id", log.related_complaint_id)
            .single();

          if (error) throw error;

          await supabase.functions.invoke("send-complaint-email", {
            body: {
              complaintId: complaint.id,
              studentEmail: complaint.profiles.email,
              studentName: complaint.profiles.full_name,
              complaintTitle: complaint.title,
              status: complaint.status,
              adminRemarks: complaint.admin_remarks,
            },
          });
        }
        toast.success("Email resent successfully");
      } else if (log.notification_type === "sms") {
        // For SMS, we'd need phone number stored in profile or metadata
        toast.error("SMS resend not implemented - phone number not available");
      }
      
      await fetchLogs();
    } catch (error: any) {
      console.error("Error resending notification:", error);
      toast.error(`Failed to resend: ${error.message}`);
    } finally {
      setResendingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500">Sent</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "email" ? (
      <Badge variant="outline" className="gap-1">
        <Mail className="h-3 w-3" />
        Email
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <MessageSquare className="h-3 w-3" />
        SMS
      </Badge>
    );
  };

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    emails: logs.filter((l) => l.notification_type === "email").length,
    sms: logs.filter((l) => l.notification_type === "sms").length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Notification Center</h1>
              <p className="text-muted-foreground">
                Monitor email and SMS delivery status
              </p>
            </div>
          </div>
          <Button onClick={fetchLogs} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sent</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Successful</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {stats.sent}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {stats.failed}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Emails</CardDescription>
              <CardTitle className="text-3xl">{stats.emails}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>SMS</CardDescription>
              <CardTitle className="text-3xl">{stats.sms}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Logs</CardTitle>
            <CardDescription>
              View and manage all notification deliveries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by recipient or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-muted-foreground">
                          No notifications found
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getTypeBadge(log.notification_type)}</TableCell>
                        <TableCell className="font-medium">
                          {log.recipient}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.subject || "N/A"}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-red-600">
                          {log.error_message || "-"}
                        </TableCell>
                        <TableCell>
                          {log.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResend(log)}
                              disabled={resendingId === log.id}
                            >
                              {resendingId === log.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "Resend"
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
