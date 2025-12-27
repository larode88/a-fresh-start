import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Search, Download, FileSignature, Clock, CheckCircle2, AlertTriangle, Eye, RefreshCw, Loader2 } from "lucide-react";

interface PowerOfAttorney {
  id: string;
  salon_name: string;
  org_number: string;
  contact_name: string;
  email: string;
  phone: string | null;
  salon_id: string | null;
  otp_expires_at: string;
  otp_attempts: number;
  signed: boolean;
  signed_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  consent_transfer: boolean;
  consent_privacy: boolean;
  created_at: string;
  admin_notified_at: string | null;
  has_existing_insurance: boolean | null;
  previous_insurers: { company: string; policy_number: string }[] | null;
  quote_id: string | null;
}

export function PowerOfAttorneyTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPoa, setSelectedPoa] = useState<PowerOfAttorney | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);

  const { data: poas, isLoading, refetch } = useQuery({
    queryKey: ["power-of-attorneys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_power_of_attorney")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PowerOfAttorney[];
    },
  });

  const getStatus = (poa: PowerOfAttorney) => {
    if (poa.signed) return "signed";
    if (new Date(poa.otp_expires_at) < new Date()) return "expired";
    return "pending";
  };

  const filteredPoas = poas?.filter((poa) => {
    const matchesSearch =
      poa.salon_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poa.org_number.includes(searchQuery) ||
      poa.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poa.contact_name.toLowerCase().includes(searchQuery.toLowerCase());

    const status = getStatus(poa);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: poas?.length || 0,
    signed: poas?.filter((p) => p.signed).length || 0,
    pending: poas?.filter((p) => !p.signed && new Date(p.otp_expires_at) >= new Date()).length || 0,
    expired: poas?.filter((p) => !p.signed && new Date(p.otp_expires_at) < new Date()).length || 0,
  };

  const handleResendOtp = async (poa: PowerOfAttorney) => {
    setIsResending(poa.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-poa-otp", {
        body: { poaId: poa.id, email: poa.email },
      });

      if (error) throw error;

      if (data?.testOtp) {
        toast.info(`Test-kode (e-post deaktivert): ${data.testOtp}`);
      } else {
        toast.success(`Ny kode sendt til ${poa.email}`);
      }
      refetch();
    } catch (error: any) {
      toast.error("Kunne ikke sende ny kode");
    } finally {
      setIsResending(null);
    }
  };

  const exportToCsv = () => {
    if (!poas?.length) return;

    const headers = ["Salongnavn", "Org.nr", "Kontaktperson", "E-post", "Telefon", "Status", "Signert dato", "Opprettet"];
    const rows = poas.map((poa) => [
      poa.salon_name,
      poa.org_number,
      poa.contact_name,
      poa.email,
      poa.phone || "",
      getStatus(poa),
      poa.signed_at ? format(new Date(poa.signed_at), "dd.MM.yyyy HH:mm") : "",
      format(new Date(poa.created_at), "dd.MM.yyyy HH:mm"),
    ]);

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fullmakter_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ poa }: { poa: PowerOfAttorney }) => {
    const status = getStatus(poa);
    if (status === "signed") {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Signert
        </Badge>
      );
    }
    if (status === "expired") {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Utløpt
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Venter
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totalt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Signert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.signed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4 text-amber-600" />
              Venter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Utløpt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Fullmakter
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="signed">Signert</SelectItem>
                  <SelectItem value="pending">Venter</SelectItem>
                  <SelectItem value="expired">Utløpt</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={exportToCsv}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salongnavn</TableHead>
                  <TableHead>Org.nr</TableHead>
                  <TableHead>Kontaktperson</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signert</TableHead>
                  <TableHead>Opprettet</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Ingen fullmakter funnet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPoas?.map((poa) => (
                    <TableRow key={poa.id}>
                      <TableCell className="font-medium">{poa.salon_name}</TableCell>
                      <TableCell>{poa.org_number}</TableCell>
                      <TableCell>{poa.contact_name}</TableCell>
                      <TableCell>{poa.email}</TableCell>
                      <TableCell>
                        <StatusBadge poa={poa} />
                      </TableCell>
                      <TableCell>
                        {poa.signed_at
                          ? format(new Date(poa.signed_at), "dd.MM.yy HH:mm", { locale: nb })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(poa.created_at), "dd.MM.yy HH:mm", { locale: nb })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedPoa(poa)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!poa.signed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResendOtp(poa)}
                              disabled={isResending === poa.id}
                            >
                              {isResending === poa.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPoa} onOpenChange={() => setSelectedPoa(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Fullmakt detaljer</DialogTitle>
            <DialogDescription>
              {selectedPoa?.salon_name} - {selectedPoa?.org_number}
            </DialogDescription>
          </DialogHeader>
          {selectedPoa && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kontaktperson</p>
                  <p className="font-medium">{selectedPoa.contact_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-post</p>
                  <p className="font-medium">{selectedPoa.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{selectedPoa.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge poa={selectedPoa} />
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Samtykker</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    {selectedPoa.consent_transfer ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Fullmakt til å flytte forsikringer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPoa.consent_privacy ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Samtykke til personvernbehandling</span>
                  </div>
                </div>
              </div>

              {/* Previous insurers section */}
              {selectedPoa.has_existing_insurance && selectedPoa.previous_insurers && selectedPoa.previous_insurers.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium">Forsikringer som skal sies opp</p>
                  <div className="space-y-2">
                    {selectedPoa.previous_insurers.map((insurer, idx) => (
                      <div key={idx} className="flex justify-between text-sm border rounded p-2">
                        <span className="font-medium">{insurer.company}</span>
                        <span className="text-muted-foreground">{insurer.policy_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPoa.signed && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium">Signeringsinfo</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Signert</p>
                      <p>{format(new Date(selectedPoa.signed_at!), "dd.MM.yyyy HH:mm:ss", { locale: nb })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">IP-adresse</p>
                      <p>{selectedPoa.ip_address || "-"}</p>
                    </div>
                  </div>
                  {selectedPoa.user_agent && (
                    <div>
                      <p className="text-muted-foreground text-sm">User Agent</p>
                      <p className="text-xs break-all text-muted-foreground">{selectedPoa.user_agent}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-4 text-sm text-muted-foreground">
                <p>Opprettet: {format(new Date(selectedPoa.created_at), "dd.MM.yyyy HH:mm:ss", { locale: nb })}</p>
                {selectedPoa.salon_id && (
                  <p className="text-green-600">✓ Koblet til eksisterende salong</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
