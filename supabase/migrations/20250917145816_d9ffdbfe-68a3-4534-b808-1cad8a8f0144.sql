-- Create virtual tags tables
CREATE TABLE IF NOT EXISTS public.virtual_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  configuracao_id INTEGER NOT NULL,
  virtual_tag_name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create virtual tag rules table
CREATE TABLE IF NOT EXISTS public.virtual_tag_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  virtual_tag_id UUID NOT NULL REFERENCES public.virtual_tags(id) ON DELETE CASCADE,
  rule_order INTEGER NOT NULL,
  rule_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create virtual tag rule conditions table
CREATE TABLE IF NOT EXISTS public.virtual_tag_rule_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.virtual_tag_rules(id) ON DELETE CASCADE,
  condition_order INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  values TEXT[] NOT NULL DEFAULT '{}',
  logical_operator TEXT NOT NULL DEFAULT 'AND',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create virtual tag rule actions table
CREATE TABLE IF NOT EXISTS public.virtual_tag_rule_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.virtual_tag_rules(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'custom_value' or 'megabill_key'
  custom_value TEXT,
  megabill_key TEXT,
  tag_color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.virtual_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tag_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tag_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tag_rule_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for virtual_tags
CREATE POLICY "Users can view virtual tags for their organization" 
ON public.virtual_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = virtual_tags.configuracao_id
  )
);

CREATE POLICY "Users can create virtual tags for their organization" 
ON public.virtual_tags 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = virtual_tags.configuracao_id
  )
);

CREATE POLICY "Users can update virtual tags for their organization" 
ON public.virtual_tags 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = virtual_tags.configuracao_id
  )
);

CREATE POLICY "Users can delete virtual tags for their organization" 
ON public.virtual_tags 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = virtual_tags.configuracao_id
  )
);

-- Create RLS policies for virtual_tag_rules
CREATE POLICY "Users can view virtual tag rules for their organization" 
ON public.virtual_tag_rules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tags vt
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vt.id = virtual_tag_rules.virtual_tag_id
  )
);

CREATE POLICY "Users can create virtual tag rules for their organization" 
ON public.virtual_tag_rules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.virtual_tags vt
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vt.id = virtual_tag_rules.virtual_tag_id
  )
);

CREATE POLICY "Users can update virtual tag rules for their organization" 
ON public.virtual_tag_rules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tags vt
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vt.id = virtual_tag_rules.virtual_tag_id
  )
);

CREATE POLICY "Users can delete virtual tag rules for their organization" 
ON public.virtual_tag_rules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tags vt
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vt.id = virtual_tag_rules.virtual_tag_id
  )
);

-- Create RLS policies for virtual_tag_rule_conditions
CREATE POLICY "Users can view virtual tag rule conditions for their organization" 
ON public.virtual_tag_rule_conditions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_conditions.rule_id
  )
);

CREATE POLICY "Users can create virtual tag rule conditions for their organization" 
ON public.virtual_tag_rule_conditions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_conditions.rule_id
  )
);

CREATE POLICY "Users can update virtual tag rule conditions for their organization" 
ON public.virtual_tag_rule_conditions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_conditions.rule_id
  )
);

CREATE POLICY "Users can delete virtual tag rule conditions for their organization" 
ON public.virtual_tag_rule_conditions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_conditions.rule_id
  )
);

-- Create RLS policies for virtual_tag_rule_actions
CREATE POLICY "Users can view virtual tag rule actions for their organization" 
ON public.virtual_tag_rule_actions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_actions.rule_id
  )
);

CREATE POLICY "Users can create virtual tag rule actions for their organization" 
ON public.virtual_tag_rule_actions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_actions.rule_id
  )
);

CREATE POLICY "Users can update virtual tag rule actions for their organization" 
ON public.virtual_tag_rule_actions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_actions.rule_id
  )
);

CREATE POLICY "Users can delete virtual tag rule actions for their organization" 
ON public.virtual_tag_rule_actions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.virtual_tag_rules vtr
    JOIN public.virtual_tags vt ON vtr.virtual_tag_id = vt.id
    JOIN public.profiles p ON TRUE
    JOIN public.api_configuracaoidmc c ON p.cliente_id = c.cliente_id
    WHERE p.id = auth.uid() AND c.id = vt.configuracao_id AND vtr.id = virtual_tag_rule_actions.rule_id
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_virtual_tags_configuracao_id ON public.virtual_tags(configuracao_id);
CREATE INDEX IF NOT EXISTS idx_virtual_tag_rules_virtual_tag_id ON public.virtual_tag_rules(virtual_tag_id);
CREATE INDEX IF NOT EXISTS idx_virtual_tag_rule_conditions_rule_id ON public.virtual_tag_rule_conditions(rule_id);
CREATE INDEX IF NOT EXISTS idx_virtual_tag_rule_actions_rule_id ON public.virtual_tag_rule_actions(rule_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_virtual_tags_updated_at
  BEFORE UPDATE ON public.virtual_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_virtual_tag_rules_updated_at
  BEFORE UPDATE ON public.virtual_tag_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();