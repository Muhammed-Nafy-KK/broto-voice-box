import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Lightbulb } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AdminAnalytics = () => {
  const [insights, setInsights] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
    fetchAIInsights();
  }, []);

  const fetchAnalytics = async () => {
    const { data: complaints } = await supabase
      .from('complaints')
      .select('*');

    if (!complaints) return;

    // Category data
    const categoryCounts: Record<string, number> = {};
    complaints.forEach(c => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });

    const categoryChartData = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value
    }));
    setCategoryData(categoryChartData);

    // Weekly data (last 7 weeks)
    const weeklyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekKey = `Week ${7 - i}`;
      weeklyMap[weekKey] = 0;
    }

    complaints.forEach(c => {
      const createdDate = new Date(c.created_at);
      const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysDiff / 7);
      if (weekIndex < 7) {
        const weekKey = `Week ${7 - weekIndex}`;
        weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
      }
    });

    const weeklyChartData = Object.entries(weeklyMap).map(([week, count]) => ({
      week,
      complaints: count
    }));
    setWeeklyData(weeklyChartData);
  };

  const fetchAIInsights = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('get-admin-insights');

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch AI insights",
        variant: "destructive",
      });
    } else {
      setInsights(data.insights);
      setStats(data.statistics);
    }
  };

  const exportToCSV = async () => {
    const { data: complaints } = await supabase
      .from('complaints')
      .select('*');

    if (!complaints) return;

    const headers = ['ID', 'Title', 'Category', 'Status', 'Priority', 'Created', 'Updated'];
    const rows = complaints.map(c => [
      c.complaint_id,
      c.title,
      c.category,
      c.status,
      (c as any).priority || 'medium',
      c.created_at,
      c.updated_at
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => cell || '').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'complaints-analytics.csv';
    a.click();

    toast({
      title: "Success",
      description: "Analytics exported to CSV",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Complaints</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resolution Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.resolutionRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.avgResponseTime}h</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.statusCounts.Pending || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Analyzing data...</p>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{insights}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Complaints by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="complaints" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
