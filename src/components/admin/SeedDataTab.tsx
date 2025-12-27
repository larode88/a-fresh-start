import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

interface TestUser {
  name: string;
  email: string;
  role: "stylist" | "daglig_leder" | "salon_owner";
  frisorfunksjon: string;
  stillingsprosent: number;
}

const TEST_USERS: TestUser[] = [
  { name: "Emma Testersen", email: "emma@dummy.no", role: "stylist", frisorfunksjon: "frisor", stillingsprosent: 100 },
  { name: "Lars Klippesen", email: "lars@dummy.no", role: "stylist", frisorfunksjon: "frisor", stillingsprosent: 80 },
  { name: "Maria Saksvik", email: "maria@dummy.no", role: "daglig_leder", frisorfunksjon: "senior_frisor", stillingsprosent: 100 },
];

const DUMMY_SALON_NAME = "HEAD FRISØR (DUMMY)";

export function SeedDataTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ email: string; success: boolean; message: string }[]>([]);

  const createTestInvitations = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Find or create the dummy salon
      let { data: salon } = await supabase
        .from("salons")
        .select("id")
        .eq("name", DUMMY_SALON_NAME)
        .single();
      
      if (!salon) {
        const { data: newSalon, error: salonError } = await supabase
          .from("salons")
          .insert({ name: DUMMY_SALON_NAME, city: "Testby" })
          .select("id")
          .single();
        
        if (salonError) throw salonError;
        salon = newSalon;
      }

      const invitationResults: { email: string; success: boolean; message: string }[] = [];

      for (const user of TEST_USERS) {
        // Check if invitation already exists
        const { data: existingInvite } = await supabase
          .from("invitations")
          .select("id, accepted")
          .eq("email", user.email)
          .single();

        if (existingInvite) {
          invitationResults.push({
            email: user.email,
            success: false,
            message: existingInvite.accepted ? "Allerede registrert" : "Invitasjon finnes allerede",
          });
          continue;
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .single();

        if (existingUser) {
          invitationResults.push({
            email: user.email,
            success: false,
            message: "Bruker finnes allerede",
          });
          continue;
        }

        // Create invitation
        const token = crypto.randomUUID();
        const { error: inviteError } = await supabase
          .from("invitations")
          .insert({
            email: user.email,
            token,
            role: user.role,
            salon_id: salon.id,
          });

        if (inviteError) {
          invitationResults.push({
            email: user.email,
            success: false,
            message: inviteError.message,
          });
        } else {
          invitationResults.push({
            email: user.email,
            success: true,
            message: `Invitasjon opprettet (token: ${token.slice(0, 8)}...)`,
          });
        }
      }

      setResults(invitationResults);
      
      const successCount = invitationResults.filter(r => r.success).length;
      toast({
        title: "Seed fullført",
        description: `${successCount} av ${TEST_USERS.length} invitasjoner opprettet`,
      });
    } catch (error) {
      console.error("Seed error:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke opprette testdata",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Testdata / Seed
          </CardTitle>
          <CardDescription>
            Opprett testbrukere for "{DUMMY_SALON_NAME}" salongen. 
            Brukere må registrere seg via /signup med e-postene nedenfor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Navn</th>
                  <th className="text-left p-3">E-post</th>
                  <th className="text-left p-3">Rolle</th>
                  <th className="text-left p-3">Stilling</th>
                </tr>
              </thead>
              <tbody>
                {TEST_USERS.map((user) => (
                  <tr key={user.email} className="border-t">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3 font-mono text-xs">{user.email}</td>
                    <td className="p-3">
                      <Badge variant="outline">{user.role}</Badge>
                    </td>
                    <td className="p-3">{user.stillingsprosent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={createTestInvitations} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opprett invitasjoner for testbrukere
          </Button>

          {results.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium">Resultater:</h4>
              {results.map((result) => (
                <div 
                  key={result.email} 
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    result.success ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-mono">{result.email}</span>
                  <span className="text-muted-foreground">— {result.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">Instruksjoner:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Klikk "Opprett invitasjoner" ovenfor</li>
              <li>Gå til <code className="bg-muted px-1 rounded">/signup</code></li>
              <li>Registrer deg med en av e-postene (f.eks. emma@dummy.no)</li>
              <li>Brukeren vil automatisk bli koblet til testalongen med riktig rolle</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
