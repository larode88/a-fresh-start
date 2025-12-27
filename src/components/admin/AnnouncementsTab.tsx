import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Calendar, Clock, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  content: string | null;
  link_type: string;
  external_url: string | null;
  slug: string;
  published: boolean;
  published_at: string | null;
  expires_at: string | null;
  display_order: number;
  target_roles: string[] | null;
  created_at: string;
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "district_manager", label: "Distriktssjef" },
  { value: "salon_owner", label: "Salongeier" },
  { value: "daglig_leder", label: "Dagligleder" },
  { value: "avdelingsleder", label: "Avdelingsleder" },
  { value: "styreleder", label: "Styreleder" },
  { value: "stylist", label: "Frisør" },
  { value: "apprentice", label: "Lærling" },
  { value: "supplier_admin", label: "Leverandør Admin" },
  { value: "supplier_sales", label: "Leverandør Salg" },
  { value: "supplier_business_dev", label: "Leverandør Forretningsutvikling" },
];

interface SortableRowProps {
  announcement: Announcement;
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
  onTogglePublished: (id: string, published: boolean) => void;
}

function SortableRow({ announcement, onEdit, onDelete, onTogglePublished }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: announcement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border">
      <td className="p-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </td>
      <td className="p-4">
        <div>
          <p className="font-medium">{announcement.title}</p>
          <p className="text-sm text-muted-foreground">
            /news/{announcement.slug}
          </p>
        </div>
      </td>
      <td className="p-4">
        {(() => {
          const now = new Date();
          const publishedAt = announcement.published_at ? new Date(announcement.published_at) : null;
          const isScheduled = announcement.published && publishedAt && publishedAt > now;
          const isPublished = announcement.published && publishedAt && publishedAt <= now;
          
          if (isScheduled) {
            return (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-amber-600">
                  {format(publishedAt, "d. MMM HH:mm", { locale: nb })}
                </span>
              </div>
            );
          } else if (isPublished) {
            return <Eye className="h-4 w-4 text-green-600" />;
          } else {
            return <EyeOff className="h-4 w-4 text-muted-foreground" />;
          }
        })()}
      </td>
      <td className="p-4">
        {format(new Date(announcement.created_at), "d. MMM yyyy", {
          locale: nb,
        })}
      </td>
      <td className="p-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(announcement)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(announcement.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

export function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    link_type: "internal",
    external_url: "",
    slug: "",
    publish_mode: "draft" as "draft" | "now" | "scheduled",
    scheduled_at: "",
    expires_at: "",
    target_roles: [] as string[],
    image_url: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = announcements.findIndex((a) => a.id === active.id);
      const newIndex = announcements.findIndex((a) => a.id === over.id);

      const newOrder = arrayMove(announcements, oldIndex, newIndex);
      setAnnouncements(newOrder);

      // Update display_order in database
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("announcements")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Rekkefølge oppdatert");
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      content: "",
      link_type: "internal",
      external_url: "",
      slug: "",
      publish_mode: "draft",
      scheduled_at: "",
      expires_at: "",
      target_roles: [],
      image_url: "",
    });
    setEditingId(null);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[æ]/g, "ae")
      .replace(/[ø]/g, "o")
      .replace(/[å]/g, "a")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("announcement-images")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Kunne ikke laste opp bilde");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("announcement-images")
      .getPublicUrl(fileName);

    setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Bilde lastet opp");
  };

  const handleGenerateImage = async () => {
    if (!form.title) {
      toast.error("Skriv en tittel først");
      return;
    }

    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-announcement-image', {
        body: { title: form.title, description: form.description }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Upload the base64 image to storage
        const base64Data = data.imageUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        const fileName = `ai-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("announcement-images")
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("announcement-images")
          .getPublicUrl(fileName);

        setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
        toast.success("AI-bilde generert!");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Kunne ikke generere bilde");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    const now = new Date();
    const publishedAt = announcement.published_at ? new Date(announcement.published_at) : null;
    
    let publishMode: "draft" | "now" | "scheduled" = "draft";
    if (announcement.published) {
      if (publishedAt && publishedAt > now) {
        publishMode = "scheduled";
      } else {
        publishMode = "now";
      }
    }
    
    setForm({
      title: announcement.title,
      description: announcement.description || "",
      content: announcement.content || "",
      link_type: announcement.link_type,
      external_url: announcement.external_url || "",
      slug: announcement.slug,
      publish_mode: publishMode,
      scheduled_at: publishedAt && publishedAt > now 
        ? publishedAt.toISOString().slice(0, 16) 
        : "",
      expires_at: announcement.expires_at
        ? announcement.expires_at.split("T")[0]
        : "",
      target_roles: announcement.target_roles || [],
      image_url: announcement.image_url || "",
    });
    setEditingId(announcement.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.slug) {
      toast.error("Tittel og slug er påkrevd");
      return;
    }

    if (form.publish_mode === "scheduled" && !form.scheduled_at) {
      toast.error("Velg et tidspunkt for planlagt publisering");
      return;
    }

    let published = false;
    let published_at: string | null = null;

    if (form.publish_mode === "now") {
      published = true;
      published_at = new Date().toISOString();
    } else if (form.publish_mode === "scheduled") {
      published = true;
      published_at = new Date(form.scheduled_at).toISOString();
    }

    const payload = {
      title: form.title,
      description: form.description || null,
      content: form.content || null,
      link_type: form.link_type,
      external_url: form.link_type === "external" ? form.external_url : null,
      slug: form.slug,
      published,
      published_at,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      target_roles: form.target_roles.length > 0 ? form.target_roles : null,
      image_url: form.image_url || null,
      display_order: editingId
        ? undefined
        : announcements.length,
    };

    if (editingId) {
      const { error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error("Kunne ikke oppdatere nyhet");
        return;
      }
      toast.success("Nyhet oppdatert");
    } else {
      const { error } = await supabase.from("announcements").insert(payload);

      if (error) {
        toast.error("Kunne ikke opprette nyhet");
        return;
      }
      toast.success("Nyhet opprettet");
    }

    setDialogOpen(false);
    resetForm();
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne nyheten?")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      toast.error("Kunne ikke slette nyhet");
      return;
    }

    toast.success("Nyhet slettet");
    fetchAnnouncements();
  };

  const togglePublished = async (id: string, published: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({
        published,
        published_at: published ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Kunne ikke oppdatere status");
      return;
    }

    fetchAnnouncements();
  };

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter((r) => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Nyheter og oppdateringer</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ny nyhet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Rediger nyhet" : "Ny nyhet"}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="edit">Rediger</TabsTrigger>
                <TabsTrigger value="preview">Forhåndsvisning</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="mt-0">
                <div className="border rounded-lg overflow-hidden bg-background">
                  {/* Preview Header Image */}
                  {form.image_url && (
                    <div className="relative h-48 w-full">
                      <img
                        src={form.image_url}
                        alt={form.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    </div>
                  )}
                  
                  {/* Preview Content */}
                  <div className="p-6">
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                      {form.title || "Tittel mangler"}
                    </h1>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(), "d. MMMM yyyy", { locale: nb })}</span>
                    </div>
                    
                    {form.description && (
                      <p className="text-lg text-muted-foreground mb-6">
                        {form.description}
                      </p>
                    )}
                    
                    {form.link_type === "internal" && form.content && (
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.content) }}
                      />
                    )}
                    
                    {form.link_type === "external" && form.external_url && (
                      <p className="text-muted-foreground">
                        Lenker til: <a href={form.external_url} className="text-primary underline" target="_blank" rel="noopener noreferrer">{form.external_url}</a>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Carousel Preview */}
                <div className="mt-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">Slik ser det ut i karusellen:</Label>
                  <div className="relative h-[140px] w-full overflow-hidden rounded-xl bg-gray-900">
                    {form.image_url && (
                      <img
                        src={form.image_url}
                        alt={form.title}
                        className="absolute inset-0 h-full w-full min-h-full min-w-full object-cover object-center opacity-80"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    <div className="relative z-10 flex h-full flex-col justify-center px-6">
                      <h3 className="text-xl font-bold text-white line-clamp-2 drop-shadow-lg max-w-3xl">
                        {form.title || "Tittel mangler"}
                      </h3>
                      {form.description && (
                        <p className="mt-1 text-sm text-white/90 line-clamp-2 drop-shadow-md max-w-3xl">
                          {form.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 underline underline-offset-4">
                          Les mer
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="edit" className="mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tittel *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Skriv en tittel..."
                />
              </div>

              <div className="space-y-2">
                <Label>Slug (URL) *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="url-vennlig-slug"
                />
              </div>

              <div className="space-y-2">
                <Label>Kort beskrivelse</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Vises i karusellen..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Bilde</Label>
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-32 w-full object-cover rounded-lg mb-2"
                  />
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !form.title}
                    title={!form.title ? "Skriv en tittel først" : "Generer bilde med AI"}
                  >
                    {generatingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last opp et bilde eller generer med AI basert på tittel.
                  <br />
                  <span className="font-medium">Anbefalt størrelse:</span> 1920×480px (4:1 format, bredt banner)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Lenketype</Label>
                <Select
                  value={form.link_type}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, link_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Intern landingsside</SelectItem>
                    <SelectItem value="external">Ekstern URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.link_type === "external" ? (
                <div className="space-y-2">
                  <Label>Ekstern URL</Label>
                  <Input
                    value={form.external_url}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, external_url: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Innhold</Label>
                  <RichTextEditor
                    content={form.content}
                    onChange={(content) =>
                      setForm((prev) => ({ ...prev, content }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Utløpsdato (valgfritt)</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, expires_at: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Målgruppe (tom = alle)</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <Button
                      key={role.value}
                      type="button"
                      variant={
                        form.target_roles.includes(role.value)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleRole(role.value)}
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Publiseringsstatus</Label>
                <Select
                  value={form.publish_mode}
                  onValueChange={(value: "draft" | "now" | "scheduled") =>
                    setForm((prev) => ({ ...prev, publish_mode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Utkast (ikke publisert)</SelectItem>
                    <SelectItem value="now">Publiser nå</SelectItem>
                    <SelectItem value="scheduled">Planlegg publisering</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.publish_mode === "scheduled" && (
                <div className="space-y-2">
                  <Label>Publiseringstidspunkt</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))
                    }
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleSubmit}>
                  {editingId ? "Lagre endringer" : "Opprett"}
                </Button>
              </div>
            </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Laster...</p>
        ) : announcements.length === 0 ? (
          <p className="text-muted-foreground">Ingen nyheter opprettet ennå.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left w-8"></th>
                  <th className="p-4 text-left font-medium">Tittel</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Opprettet</th>
                  <th className="p-4 text-right font-medium">Handlinger</th>
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={announcements.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {announcements.map((announcement) => (
                      <SortableRow
                        key={announcement.id}
                        announcement={announcement}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTogglePublished={togglePublished}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
