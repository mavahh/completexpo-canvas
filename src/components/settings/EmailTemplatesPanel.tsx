import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Save, Plus, Pencil, Eye, Mail, Trash2 } from 'lucide-react';

const TEMPLATE_TYPES = [
  { value: 'CONFIRMATION', label: 'Bevestiging', description: 'Wordt verstuurd na goedkeuring van een standaanvraag' },
  { value: 'INVITATION', label: 'Uitnodiging', description: 'Uitnodiging voor exposanten om deel te nemen' },
  { value: 'REMINDER', label: 'Herinnering', description: 'Herinnering voor exposanten (bijv. deadline)' },
  { value: 'REJECTION', label: 'Afwijzing', description: 'Wordt verstuurd bij afwijzing van een aanvraag' },
  { value: 'CUSTOM', label: 'Aangepast', description: 'Vrij te gebruiken template' },
] as const;

const AVAILABLE_VARIABLES = [
  { key: '{{event_name}}', description: 'Naam van het evenement' },
  { key: '{{exhibitor_name}}', description: 'Naam van de exposant' },
  { key: '{{contact_name}}', description: 'Contactpersoon' },
  { key: '{{stand_label}}', description: 'Standnummer' },
  { key: '{{event_date}}', description: 'Datum van het evenement' },
  { key: '{{event_location}}', description: 'Locatie van het evenement' },
];

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
}

interface Props {
  eventId: string;
  canManage: boolean;
}

export default function EmailTemplatesPanel({ eventId, canManage }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Editor state
  const [editorName, setEditorName] = useState('');
  const [editorSubject, setEditorSubject] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [editorType, setEditorType] = useState<string>('CUSTOM');
  const [editorActive, setEditorActive] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [eventId]);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');

    if (error) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const openNewTemplate = (type: string) => {
    const typeDef = TEMPLATE_TYPES.find(t => t.value === type);
    setEditingTemplate(null);
    setEditorType(type);
    setEditorName(typeDef?.label || 'Nieuw template');
    setEditorSubject('');
    setEditorBody(getDefaultBody(type));
    setEditorActive(true);
    setShowEditor(true);
  };

  const openEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditorType(template.type);
    setEditorName(template.name);
    setEditorSubject(template.subject);
    setEditorBody(template.body_html);
    setEditorActive(template.is_active);
    setShowEditor(true);
  };

  const getDefaultBody = (type: string): string => {
    switch (type) {
      case 'CONFIRMATION':
        return `Beste {{contact_name}},

Uw deelname aan {{event_name}} is bevestigd.

Standnummer: {{stand_label}}
Datum: {{event_date}}
Locatie: {{event_location}}

Met vriendelijke groet,
De organisatie`;
      case 'INVITATION':
        return `Beste {{contact_name}},

Wij nodigen {{exhibitor_name}} graag uit voor {{event_name}}.

Datum: {{event_date}}
Locatie: {{event_location}}

Met vriendelijke groet,
De organisatie`;
      case 'REMINDER':
        return `Beste {{contact_name}},

Dit is een herinnering voor {{event_name}}.

Datum: {{event_date}}
Locatie: {{event_location}}

Met vriendelijke groet,
De organisatie`;
      case 'REJECTION':
        return `Beste {{contact_name}},

Helaas kunnen wij uw aanvraag voor {{event_name}} niet honoreren.

Met vriendelijke groet,
De organisatie`;
      default:
        return '';
    }
  };

  const handleSave = async () => {
    if (!editorSubject.trim() && !editorBody.trim()) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Vul een onderwerp en inhoud in.' });
      return;
    }
    setSaving(true);

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: editorName,
            subject: editorSubject,
            body_html: editorBody,
            is_active: editorActive,
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast({ title: 'Opgeslagen', description: 'Template is bijgewerkt.' });
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            event_id: eventId,
            type: editorType as any,
            name: editorName,
            subject: editorSubject,
            body_html: editorBody,
            is_active: editorActive,
          });
        if (error) throw error;
        toast({ title: 'Aangemaakt', description: 'Template is opgeslagen.' });
      }

      setShowEditor(false);
      fetchTemplates();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Fout', description: error.message });
    } else {
      toast({ title: 'Verwijderd' });
      fetchTemplates();
    }
  };

  const renderPreview = (body: string) => {
    return body
      .replace(/{{event_name}}/g, 'Voorbeeld Beurs 2026')
      .replace(/{{exhibitor_name}}/g, 'Acme BV')
      .replace(/{{contact_name}}/g, 'Jan de Vries')
      .replace(/{{stand_label}}/g, 'A-12')
      .replace(/{{event_date}}/g, '15-20 maart 2026')
      .replace(/{{event_location}}/g, 'Expo Antwerpen');
  };

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin" />;
  }

  return (
    <div className="space-y-6">
      {/* Template type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATE_TYPES.map((type) => {
          const existing = templates.find(t => t.type === type.value);

          return (
            <Card key={type.value} className={existing ? 'border-primary/30' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">{type.label}</CardTitle>
                  </div>
                  {existing && (
                    <Badge variant={existing.is_active ? 'default' : 'secondary'}>
                      {existing.is_active ? 'Actief' : 'Inactief'}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {existing ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground truncate">
                      <span className="font-medium text-foreground">Onderwerp:</span> {existing.subject || '(geen)'}
                    </p>
                    <div className="flex gap-2">
                      {canManage && (
                        <Button size="sm" variant="outline" onClick={() => openEditTemplate(existing)}>
                          <Pencil className="w-3 h-3 mr-1" /> Bewerken
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setPreviewTemplate(existing)}>
                        <Eye className="w-3 h-3 mr-1" /> Preview
                      </Button>
                      {canManage && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(existing.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  canManage && (
                    <Button size="sm" variant="outline" onClick={() => openNewTemplate(type.value)}>
                      <Plus className="w-3 h-3 mr-1" /> Template aanmaken
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Variables reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Beschikbare variabelen</CardTitle>
          <CardDescription className="text-xs">Gebruik deze in je templates. Ze worden automatisch ingevuld.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <div key={v.key} className="flex items-center gap-2 text-sm">
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{v.key}</code>
                <span className="text-muted-foreground text-xs">{v.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Template bewerken' : 'Nieuw template'}</DialogTitle>
            <DialogDescription>
              {TEMPLATE_TYPES.find(t => t.value === editorType)?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Naam</Label>
              <Input value={editorName} onChange={(e) => setEditorName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Onderwerp</Label>
              <Input
                value={editorSubject}
                onChange={(e) => setEditorSubject(e.target.value)}
                placeholder="bijv. Bevestiging deelname {{event_name}}"
              />
            </div>

            <div className="space-y-2">
              <Label>Inhoud</Label>
              <Textarea
                value={editorBody}
                onChange={(e) => setEditorBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Gebruik variabelen zoals {{contact_name}}, {{event_name}}..."
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={editorActive} onCheckedChange={setEditorActive} />
              <Label>Template actief</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>Zo ziet de e-mail eruit met voorbeelddata</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Onderwerp</Label>
                <p className="font-medium">{renderPreview(previewTemplate.subject)}</p>
              </div>
              <div className="border rounded-lg p-4 bg-muted/30">
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {renderPreview(previewTemplate.body_html)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
