import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VirtualTag {
  id: string;
  virtual_tag_name: string;
  rules?: VirtualTagRule[];
  virtual_tag_rules?: VirtualTagRule[];
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

interface VirtualTagRuleBuilderProps {
  virtualTag: VirtualTag;
  onRulesChange: () => void;
}

const FIELD_OPTIONS = [
  { value: 'project_name', label: 'Nome do Projeto' },
  { value: 'asset_name', label: 'Nome do Asset' },
  { value: 'asset_type', label: 'Tipo do Asset' },
  { value: 'folder_name', label: 'Nome da Pasta' },
  { value: 'org_id', label: 'ID da Organização' },
  { value: 'org_name', label: 'Nome da Organização' },
  { value: 'meter_name', label: 'Nome do Medidor' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'Não é igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'not_contains', label: 'Não contém' },
  { value: 'in', label: 'Está em' },
  { value: 'not_in', label: 'Não está em' },
  { value: 'exists', label: 'Existe' },
  { value: 'not_exists', label: 'Não existe' },
];

const TAG_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export function VirtualTagRuleBuilder({ virtualTag, onRulesChange }: VirtualTagRuleBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<VirtualTagRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    active: true,
    conditions: [{
      field_name: '',
      operator: 'equals',
      values: [''],
      logical_operator: 'AND'
    }],
    action: {
      action_type: 'custom_value',
      custom_value: '',
      megabill_key: '',
      tag_color: TAG_COLORS[0]
    }
  });

  const resetRuleForm = () => {
    setRuleForm({
      rule_name: '',
      active: true,
      conditions: [{
        field_name: '',
        operator: 'equals',
        values: [''],
        logical_operator: 'AND'
      }],
      action: {
        action_type: 'custom_value',
        custom_value: '',
        megabill_key: '',
        tag_color: TAG_COLORS[0]
      }
    });
    setEditingRule(null);
  };

  const handleAddCondition = () => {
    setRuleForm(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          field_name: '',
          operator: 'equals',
          values: [''],
          logical_operator: 'AND'
        }
      ]
    }));
  };

  const handleRemoveCondition = (index: number) => {
    if (ruleForm.conditions.length > 1) {
      setRuleForm(prev => ({
        ...prev,
        conditions: prev.conditions.filter((_, i) => i !== index)
      }));
    }
  };

  const handleConditionChange = (index: number, field: string, value: any) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }));
  };

  const handleSaveRule = async () => {
    if (!ruleForm.rule_name.trim()) {
      toast.error('Nome da regra é obrigatório');
      return;
    }

    // Validate conditions
    for (const condition of ruleForm.conditions) {
      if (!condition.field_name) {
        toast.error('Todos os campos das condições devem ser preenchidos');
        return;
      }
      if (!condition.values[0] && !['exists', 'not_exists'].includes(condition.operator)) {
        toast.error('Valores das condições devem ser preenchidos');
        return;
      }
    }

    // Validate action
    if (ruleForm.action.action_type === 'custom_value' && !ruleForm.action.custom_value.trim()) {
      toast.error('Valor customizado é obrigatório');
      return;
    }
    if (ruleForm.action.action_type === 'megabill_key' && !ruleForm.action.megabill_key.trim()) {
      toast.error('Chave MegaBill é obrigatória');
      return;
    }

    try {
      // Get next rule order
      const maxOrder = Math.max(0, ...(virtualTag.rules?.map(r => r.rule_order) || []));
      const nextOrder = maxOrder + 1;

      // Create/update rule
      const ruleData = {
        virtual_tag_id: virtualTag.id,
        rule_order: editingRule?.rule_order || nextOrder,
        rule_name: ruleForm.rule_name.trim(),
        active: ruleForm.active
      };

      let ruleId: string;

      if (editingRule) {
        const { error } = await supabase
          .from('virtual_tag_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
        ruleId = editingRule.id;

        // Delete existing conditions and actions
        await supabase.from('virtual_tag_rule_conditions').delete().eq('rule_id', ruleId);
        await supabase.from('virtual_tag_rule_actions').delete().eq('rule_id', ruleId);
      } else {
        const { data, error } = await supabase
          .from('virtual_tag_rules')
          .insert([ruleData])
          .select()
          .single();

        if (error) throw error;
        ruleId = data.id;
      }

      // Create conditions
      const conditionsData = ruleForm.conditions.map((condition, index) => ({
        rule_id: ruleId,
        condition_order: index + 1,
        field_name: condition.field_name,
        operator: condition.operator,
        values: condition.values.filter(v => v.trim()),
        logical_operator: index < ruleForm.conditions.length - 1 ? condition.logical_operator : 'AND'
      }));

      const { error: conditionsError } = await supabase
        .from('virtual_tag_rule_conditions')
        .insert(conditionsData);

      if (conditionsError) throw conditionsError;

      // Create action
      const actionData = {
        rule_id: ruleId,
        action_type: ruleForm.action.action_type,
        custom_value: ruleForm.action.action_type === 'custom_value' ? ruleForm.action.custom_value : null,
        megabill_key: ruleForm.action.action_type === 'megabill_key' ? ruleForm.action.megabill_key : null,
        tag_color: ruleForm.action.tag_color
      };

      const { error: actionError } = await supabase
        .from('virtual_tag_rule_actions')
        .insert([actionData]);

      if (actionError) throw actionError;

      toast.success(editingRule ? 'Regra atualizada com sucesso!' : 'Regra criada com sucesso!');
      setDialogOpen(false);
      resetRuleForm();
      onRulesChange();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Erro ao salvar regra');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;

    try {
      const { error } = await supabase
        .from('virtual_tag_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      
      toast.success('Regra excluída com sucesso!');
      onRulesChange();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Erro ao excluir regra');
    }
  };

  const rules = virtualTag.virtual_tag_rules || virtualTag.rules || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Regras ({rules.length})</h4>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetRuleForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editar Regra' : 'Nova Regra'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Rule Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule_name">Nome da Regra *</Label>
                  <Input
                    id="rule_name"
                    value={ruleForm.rule_name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, rule_name: e.target.value }))}
                    placeholder="Ex: Ambiente de Produção"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="rule_active"
                    checked={ruleForm.active}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="rule_active" className="text-sm">Regra ativa</Label>
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Condições (WHERE)</h5>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddCondition}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Condição
                  </Button>
                </div>
                
                {ruleForm.conditions.map((condition, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Condição {index + 1}</span>
                      {ruleForm.conditions.length > 1 && (
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRemoveCondition(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Campo</Label>
                        <Select
                          value={condition.field_name}
                          onValueChange={(value) => handleConditionChange(index, 'field_name', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o campo" />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_OPTIONS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Operador</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => handleConditionChange(index, 'operator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATOR_OPTIONS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Valor</Label>
                        <Input
                          value={condition.values[0] || ''}
                          onChange={(e) => handleConditionChange(index, 'values', [e.target.value])}
                          placeholder="Valor para comparação"
                          disabled={['exists', 'not_exists'].includes(condition.operator)}
                        />
                      </div>
                    </div>
                    
                    {index < ruleForm.conditions.length - 1 && (
                      <div>
                        <Label>Operador Lógico</Label>
                        <Select
                          value={condition.logical_operator}
                          onValueChange={(value) => handleConditionChange(index, 'logical_operator', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">E</SelectItem>
                            <SelectItem value="OR">OU</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="space-y-4">
                <h5 className="font-medium">Ação (THEN)</h5>
                
                <div className="border rounded-lg p-4 space-y-3">
                  <div>
                    <Label>Tipo de Ação</Label>
                    <Select
                      value={ruleForm.action.action_type}
                      onValueChange={(value) => setRuleForm(prev => ({
                        ...prev,
                        action: { ...prev.action, action_type: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom_value">Valor Customizado</SelectItem>
                        <SelectItem value="megabill_key">Chave MegaBill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {ruleForm.action.action_type === 'custom_value' ? (
                    <div>
                      <Label>Valor Customizado</Label>
                      <Input
                        value={ruleForm.action.custom_value}
                        onChange={(e) => setRuleForm(prev => ({
                          ...prev,
                          action: { ...prev.action, custom_value: e.target.value }
                        }))}
                        placeholder="Ex: Produção"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>Chave MegaBill</Label>
                      <Select
                        value={ruleForm.action.megabill_key}
                        onValueChange={(value) => setRuleForm(prev => ({
                          ...prev,
                          action: { ...prev.action, megabill_key: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a chave" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label>Cor da Tag</Label>
                    <div className="flex gap-2 mt-2">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            ruleForm.action.tag_color === color ? 'border-foreground' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setRuleForm(prev => ({
                            ...prev,
                            action: { ...prev.action, tag_color: color }
                          }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSaveRule}>
                  {editingRule ? 'Atualizar Regra' : 'Criar Regra'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Settings className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Nenhuma regra configurada</p>
          <p className="text-xs">Clique em "Nova Regra" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules
            .sort((a, b) => a.rule_order - b.rule_order)
            .map((rule, index) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Regra {index + 1}: {rule.rule_name}</span>
                  <Badge variant={rule.active ? "default" : "secondary"} className="text-xs">
                    {rule.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  {rule.conditions && rule.conditions.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {rule.conditions.length} condição(ões)
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingRule(rule);
                      // Populate form with existing data
                      setRuleForm({
                        rule_name: rule.rule_name,
                        active: rule.active,
                        conditions: rule.conditions?.map(c => ({
                          field_name: c.field_name,
                          operator: c.operator,
                          values: c.values,
                          logical_operator: c.logical_operator
                        })) || [{
                          field_name: '',
                          operator: 'equals',
                          values: [''],
                          logical_operator: 'AND'
                        }],
                        action: rule.actions?.[0] ? {
                          action_type: rule.actions[0].action_type,
                          custom_value: rule.actions[0].custom_value || '',
                          megabill_key: rule.actions[0].megabill_key || '',
                          tag_color: rule.actions[0].tag_color
                        } : {
                          action_type: 'custom_value',
                          custom_value: '',
                          megabill_key: '',
                          tag_color: TAG_COLORS[0]
                        }
                      });
                      setDialogOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}