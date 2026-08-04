import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Search, Send, User as UserIcon } from "lucide-react";

interface MsgUser {
  user_id: string; email: string | null; display_name: string | null;
  plan: string; subscription_status: string; current_period_end: string | null;
  status?: string | null; banned_at?: string | null;
  scans_used_month?: number; bonus_scans?: number; created_at?: string;
}

interface AdminMessage {
  id: string; recipient_user_id: string; recipient_email: string | null; recipient_name: string | null;
  message_type: string; title: string; body: string; severity: string;
  created_at: string; read_at: string | null; sent_by: string | null;
}

const TEMPLATES: Record<string, { label: string; title: string; body: string; severity: string }> = {
  subscription_activated: {
    label: "Subscription Activated",
    title: "Subscription Activated 🎉",
    body: "Congrats! Your ResumeShot Pro subscription has been activated successfully. You can now access all Pro features from your dashboard.",
    severity: "success",
  },
  subscription_expiring: {
    label: "Subscription Expiring",
    title: "Your subscription expires soon",
    body: "Heads up — your ResumeShot subscription is expiring shortly. Renew now to keep unlimited access to your tailored resumes and ATS scans.",
    severity: "warn",
  },
  subscription_expired: {
    label: "Subscription Expired",
    title: "Your subscription has expired",
    body: "Your ResumeShot subscription has ended. Your account has moved to the Free plan. Upgrade any time to restore Pro features.",
    severity: "warn",
  },
  payment_issue: {
    label: "Payment Issue",
    title: "We couldn't process your payment",
    body: "There was a problem with your latest payment. Please update your payment method from the dashboard so your plan stays active.",
    severity: "warn",
  },
  warning: {
    label: "Warning",
    title: "Important account warning",
    body: "We've noticed activity on your account that violates our terms of service. Please review our policies to avoid further action.",
    severity: "warn",
  },
  account_notice: {
    label: "Account Notice",
    title: "An update about your account",
    body: "We're reaching out with an important notice regarding your ResumeShot account.",
    severity: "info",
  },
  feature_update: {
    label: "Feature Update",
    title: "New in ResumeShot ✨",
    body: "We just shipped new features to help you land interviews faster. Open your dashboard to try them out.",
    severity: "info",
  },
  general: {
    label: "General Message",
    title: "A message from the ResumeShot team",
    body: "",
    severity: "info",
  },
  custom: { label: "Custom", title: "", body: "", severity: "info" },
};

const TYPE_LABEL = (t: string) => TEMPLATES[t]?.label ?? t;

function fmt(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString();
}

export function UserMessagesPanel() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<MsgUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MsgUser | null>(null);

  const [messageType, setMessageType] = useState("general");
  const [severity, setSeverity] = useState("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<AdminMessage[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyType, setHistoryType] = useState("all");
  const [historyBusy, setHistoryBusy] = useState(false);

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-send-message", { body: payload });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }, []);

  const searchUsers = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await call({ action: "search_users", query: q });
      setUsers(res.users ?? []);
    } catch (e) {
      toast({ title: "Search failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }, [call]);

  const loadHistory = useCallback(async () => {
    setHistoryBusy(true);
    try {
      const res = await call({ action: "history", query: historyQuery, type: historyType });
      setHistory(res.messages ?? []);
    } catch (e) {
      toast({ title: "Couldn't load history", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setHistoryBusy(false);
    }
  }, [call, historyQuery, historyType]);

  useEffect(() => { searchUsers(""); loadHistory(); /* eslint-disable-next-line */ }, []);

  const applyType = (t: string) => {
    setMessageType(t);
    const tpl = TEMPLATES[t];
    if (!tpl) return;
    setSeverity(tpl.severity);
    if (t !== "custom") {
      setTitle(tpl.title);
      setBody(tpl.body);
    }
  };

  const canSend = !!selected && title.trim().length > 0 && body.trim().length > 0;

  const send = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await call({
        action: "send",
        user_id: selected.user_id,
        message_type: messageType,
        severity,
        title: title.trim(),
        body: body.trim(),
        cta_label: ctaLabel.trim() || null,
        cta_url: ctaUrl.trim() || null,
      });
      toast({ title: "Message sent successfully." });
      setTitle(""); setBody(""); setCtaLabel(""); setCtaUrl("");
      setConfirmOpen(false);
      loadHistory();
    } catch (e) {
      toast({ title: "Failed to send", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const recipientName = selected?.display_name || selected?.email || "this user";

  const filteredHistory = useMemo(() => history, [history]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" /> User Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="compose">
          <TabsList>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="history" onClick={() => loadHistory()}>Message History</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Search + select */}
              <div className="space-y-3">
                <Label className="text-xs">Search users (name, email or user ID)</Label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUsers(query)}
                    placeholder="jane@example.com"
                  />
                  <Button variant="secondary" onClick={() => searchUsers(query)} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                  {users.length === 0 && (
                    <div className="p-4 text-xs text-muted-foreground text-center">No users found.</div>
                  )}
                  {users.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => setSelected(u)}
                      className={`w-full text-left px-3 py-2 hover:bg-muted/60 ${selected?.user_id === u.user_id ? "bg-primary/10" : ""}`}
                    >
                      <div className="text-xs font-medium truncate">{u.display_name || "—"}</div>
                      <div className="text-[0.7rem] text-muted-foreground truncate">{u.email}</div>
                      <div className="mt-1 flex gap-1">
                        <Badge variant="secondary" className="text-[0.6rem]">{u.plan}</Badge>
                        <Badge variant="outline" className="text-[0.6rem]">{u.subscription_status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>

                {selected && (
                  <div className="rounded-md border p-3 space-y-1 bg-muted/30">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <UserIcon className="h-3.5 w-3.5" /> {selected.display_name || "Unnamed user"}
                    </div>
                    <div className="text-[0.7rem] text-muted-foreground">{selected.email}</div>
                    <div className="text-[0.7rem] text-muted-foreground break-all">ID: {selected.user_id}</div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-[0.7rem]">
                      <span>Plan: <b>{selected.plan}</b></span>
                      <span>Status: <b>{selected.subscription_status}</b></span>
                      <span>Expires: <b>{selected.current_period_end ? new Date(selected.current_period_end).toLocaleDateString() : "—"}</b></span>
                      <span>Account: <b>{selected.banned_at ? "banned" : (selected.status || "active")}</b></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Compose */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Message type</Label>
                    <Select value={messageType} onValueChange={applyType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TEMPLATES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Severity</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="Subscription Activated 🎉" />
                </div>
                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea rows={6} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
                  <p className="text-[0.65rem] text-muted-foreground mt-1">{body.length}/4000</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Button label (optional)</Label>
                    <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Open dashboard" />
                  </div>
                  <div>
                    <Label className="text-xs">Button link (optional)</Label>
                    <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/dashboard" />
                  </div>
                </div>

                {(title || body) && (
                  <div className="rounded-md border p-3 bg-background">
                    <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">Preview</p>
                    <div className="text-xs font-semibold">{title || "(no title)"}</div>
                    <p className="text-[0.7rem] text-muted-foreground whitespace-pre-wrap mt-0.5">{body || "(empty message)"}</p>
                  </div>
                )}

                <Button className="w-full" disabled={!canSend} onClick={() => setConfirmOpen(true)}>
                  <Send className="h-4 w-4 mr-2" /> Send message
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadHistory()}
                placeholder="Search recipient or title"
              />
              <Select value={historyType} onValueChange={(v) => setHistoryType(v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(TEMPLATES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={loadHistory} disabled={historyBusy}>
                {historyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">No messages yet.</TableCell></TableRow>
                  )}
                  {filteredHistory.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{m.recipient_name || "—"}</TableCell>
                      <TableCell className="text-xs">{m.recipient_email}</TableCell>
                      <TableCell className="text-xs">{TYPE_LABEL(m.message_type)}</TableCell>
                      <TableCell className="text-xs max-w-[16rem] truncate">{m.title}</TableCell>
                      <TableCell className="text-xs">{fmt(m.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={m.read_at ? "secondary" : "outline"} className="text-[0.6rem]">
                          {m.read_at ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this message to {recipientName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll receive it instantly in their notifications. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); send(); }} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
