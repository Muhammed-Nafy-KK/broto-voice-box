import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StudentId {
  id: string;
  student_id: string;
  student_name: string | null;
  is_active: boolean;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
}

const StudentIds = () => {
  const [studentIds, setStudentIds] = useState<StudentId[]>([]);
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudentIds();
  }, []);

  const fetchStudentIds = async () => {
    const { data, error } = await supabase
      .from("student_ids")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch student IDs");
    } else {
      setStudentIds(data || []);
    }
  };

  const handleAddStudentId = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Unauthorized");
        return;
      }

      const { error } = await supabase
        .from("student_ids")
        .insert([
          {
            student_id: newStudentId,
            student_name: newStudentName || null,
            created_by: user.id,
          },
        ]);

      if (error) throw error;

      toast.success("Student ID added successfully");
      setNewStudentId("");
      setNewStudentName("");
      setIsDialogOpen(false);
      fetchStudentIds();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudentId = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student ID?")) return;

    const { error } = await supabase
      .from("student_ids")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete student ID");
    } else {
      toast.success("Student ID deleted successfully");
      fetchStudentIds();
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Unauthorized");
        return;
      }

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('student') ? 1 : 0;
      const studentIdsToInsert = [];

      for (let i = startIndex; i < lines.length; i++) {
        const [studentId, studentName] = lines[i].split(',').map(s => s.trim());
        if (studentId) {
          studentIdsToInsert.push({
            student_id: studentId,
            student_name: studentName || null,
            created_by: user.id,
          });
        }
      }

      if (studentIdsToInsert.length === 0) {
        toast.error("No valid student IDs found in CSV");
        return;
      }

      const { error } = await supabase
        .from("student_ids")
        .insert(studentIdsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${studentIdsToInsert.length} student IDs`);
      setIsBulkDialogOpen(false);
      fetchStudentIds();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = "student_id,student_name\nSTU001,John Doe\nSTU002,Jane Smith";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_ids_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Student ID Management</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Import Student IDs</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>CSV File Format</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with columns: student_id, student_name (optional)
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={downloadTemplate}
                      className="p-0 h-auto"
                    >
                      Download Template
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Upload CSV</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleCSVUpload}
                      disabled={isLoading}
                    />
                  </div>
                  {isLoading && (
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student ID
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student ID</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStudentId} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-id">Student ID</Label>
                    <Input
                      id="student-id"
                      placeholder="STU001"
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Student Name (Optional)</Label>
                    <Input
                      id="student-name"
                      placeholder="John Doe"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Adding..." : "Add Student ID"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Student IDs ({studentIds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Used At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentIds.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.student_id}</TableCell>
                    <TableCell>{item.student_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.used_by ? "secondary" : "default"}>
                        {item.used_by ? "Used" : "Available"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.used_by || "-"}</TableCell>
                    <TableCell>
                      {item.used_at ? new Date(item.used_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStudentId(item.id)}
                        disabled={!!item.used_by}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentIds;
