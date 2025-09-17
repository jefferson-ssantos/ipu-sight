import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Tags, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { VirtualTagRuleBuilder } from './VirtualTagRuleBuilder';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface VirtualTag {
  id: string;
  configuracao_id: number;
  virtual_tag_name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  rules?: VirtualTagRule[];
}

interface VirtualTagRule {
  id: string;
  virtual_tag_id: string;
  rule_order: number;
  rule_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  conditions?: VirtualTagRuleCondition[];
  actions?: VirtualTagRuleAction[];
}

interface VirtualTagRuleCondition {
  id: string;
  rule_id: string;
  condition_order: number;
  field_name: string;
  operator: string;
  values: string[];
  logical_operator: string;
  created_at: string;
}

interface VirtualTagRuleAction {
  id: string;
  rule_id: string;
  action_type: string;
  custom_value: string | null;
  megabill_key: string | null;
  tag_color: string;
  created_at: string;
}

export function VirtualTagManager() {
  const { user } = useAuth();
  const [virtualTags, setVirtualTags] = useState<VirtualTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<VirtualTag | null>(null);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    virtual_tag_name: '',
    description: '',
    active: true
  });

  useEffect(() => {
    if (user) {
      fetchVirtualTags();
    }
  }, [user]);

  const fetchVirtualTags = async () => {
    try {
      setLoading(true);
      
      // Get user's profile and configurations
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.cliente_id) return;

      const { data: configs } = await supabase
        .from('api_configuracaoidmc')
        .select('id')
        .eq('cliente_id', profile.cliente_id);

      if (!configs?.length) return;

      // Fetch virtual tags
      const { data: tags, error } = await supabase
        .from('virtual_tags')
        .select(`
          *,
          virtual_tag_rules (
            *,
            virtual_tag_rule_conditions (*),
            virtual_tag_rule_actions (*)
          )
        `)
        .in('configuracao_id', configs.map(c => c.id))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching virtual tags:', error);
        throw error;
      }

      setVirtualTags(tags || []);
    } catch (error) {
      console.error('Error in fetchVirtualTags:', error);
      toast.error('Erro ao carregar Virtual Tags');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.virtual_tag_name.trim()) {
      toast.error('Nome da Virtual Tag é obrigatório');
      return;
    }

    try {
      // Get user's configuration ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.cliente_id) return;

      const { data: configs } = await supabase
        .from('api_configuracaoidmc')
        .select('id')
        .eq('cliente_id', profile.cliente_id)
        .limit(1);

      if (!configs?.length) return;

      const tagData = {
        configuracao_id: configs[0].id,
        virtual_tag_name: formData.virtual_tag_name.trim(),
        description: formData.description.trim() || null,
        active: formData.active
      };

      if (editingTag) {
        const { error } = await supabase
          .from('virtual_tags')
          .update(tagData)
          .eq('id', editingTag.id);

        if (error) throw error;
        toast.success('Virtual Tag atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('virtual_tags')
          .insert([tagData]);

        if (error) throw error;
        toast.success('Virtual Tag criada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchVirtualTags();
    } catch (error: any) {
      console.error('Error saving virtual tag:', error);
      toast.error('Erro ao salvar Virtual Tag');
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta Virtual Tag? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('virtual_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      
      toast.success('Virtual Tag excluída com sucesso!');
      fetchVirtualTags();
    } catch (error) {
      console.error('Error deleting virtual tag:', error);
      toast.error('Erro ao excluir Virtual Tag');
    }
  };

  const handleEdit = (tag: VirtualTag) => {
    setEditingTag(tag);
    setFormData({
      virtual_tag_name: tag.virtual_tag_name,
      description: tag.description || '',
      active: tag.active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      virtual_tag_name: '',
      description: '',
      active: true
    });
    setEditingTag(null);
  };

  const toggleTagExpansion = (tagId: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tagId)) {
      newExpanded.delete(tagId);
    } else {
      newExpanded.add(tagId);
    }
    setExpandedTags(newExpanded);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando Virtual Tags...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Virtual Tags
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Crie tags virtuais baseadas em regras para categorizar automaticamente seus recursos e custos.
                Esta funcionalidade está disponível apenas no plano Pro.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Virtual Tag
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingTag ? 'Editar Virtual Tag' : 'Nova Virtual Tag'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="virtual_tag_name">Nome *</Label>
                    <Input
                      id="virtual_tag_name"
                      value={formData.virtual_tag_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, virtual_tag_name: e.target.value }))}
                      placeholder="Ex: Ambiente de Produção"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o propósito desta Virtual Tag"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="active" className="text-sm">Ativa</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingTag ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {virtualTags.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma Virtual Tag encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira Virtual Tag para automatizar a categorização dos seus recursos.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira Virtual Tag
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {virtualTags.map((tag) => (
                <Card key={tag.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Collapsible>
                        <CollapsibleTrigger 
                          className="flex items-center gap-2 hover:text-primary"
                          onClick={() => toggleTagExpansion(tag.id)}
                        >
                          {expandedTags.has(tag.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <h3 className="font-semibold">{tag.virtual_tag_name}</h3>
                          <Badge variant={tag.active ? "default" : "secondary"}>
                            {tag.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </CollapsibleTrigger>
                      </Collapsible>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(tag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {tag.description && (
                      <p className="text-sm text-muted-foreground">{tag.description}</p>
                    )}
                  </CardHeader>
                  
                  {expandedTags.has(tag.id) && (
                    <CardContent className="pt-0">
                      <VirtualTagRuleBuilder 
                        virtualTag={tag} 
                        onRulesChange={fetchVirtualTags}
                      />
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}