import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, IndianRupee, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const ADMIN_EMAIL = "nandunaidu656565@gmail.com";

interface AdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  subscription_status: string;
  scans_used_month: number;
  current_period_end: string | null;
  created_at: string;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<{ users: AdminUser[]; total: number; counts: Record<string, number>; monthlyRevenueINR: number } | null>(null);
  const [busy, setBusy] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const load = async () => {
    setBusy(true);
    const { data: res, error } = await supabase.functions.invoke("admin-list-users");
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setData(res);
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const updatePlan = async (user_id: string, plan: string) => {
    setUpdating(user_id);
    const { error } = await supabase.functions.invoke("admin-update-plan", { body: { user_id, plan } });
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Plan updated" }); await load(); }
    setUpdating(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, plans, and view revenue.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data?.total ?? "—"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">₹{data?.monthlyRevenueINR?.toLocaleString("en-IN") ?? "—"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Basic / Pro</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{(data?.counts.basic ?? 0)} / {(data?.counts.pro ?? 0)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Free Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data?.counts.free ?? 0}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent>
            {busy ? (
              <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scans</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Change Plan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.display_name || "—"}</TableCell>
                        <TableCell><Badge variant={u.plan === "free" ? "secondary" : "default"}>{u.plan}</Badge></TableCell>
                        <TableCell><Badge variant={u.subscription_status === "active" ? "default" : "outline"}>{u.subscription_status}</Badge></TableCell>
                        <TableCell>{u.scans_used_month}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select disabled={updating === u.user_id} value={u.plan} onValueChange={(v) => updatePlan(u.user_id, v)}>
                            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
