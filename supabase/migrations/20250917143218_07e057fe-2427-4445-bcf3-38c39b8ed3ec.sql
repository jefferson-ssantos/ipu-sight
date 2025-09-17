-- Create Virtual Tags table for advanced tag management
CREATE TABLE public.virtual_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  configuracao_id INTEGER NOT NULL,
  virtual_tag_name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_virtual_tags_configuracao 
    FOREIGN KEY (configuracao_id) 
    REFERENCES api_configuracaoidmc(id) 
    ON DELETE CASCADE
);

-- Create Virtual Tag Rules table
CREATE TABLE public.virtual_tag_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  virtual_tag_id UUID NOT NULL,
  rule_order INTEGER NOT NULL DEFAULT 1,
  rule_name VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_virtual_tag_rules_virtual_tag 
    FOREIGN KEY (virtual_tag_id) 
    REFERENCES virtual_tags(id) 
    ON DELETE CASCADE
);

-- Create Virtual Tag Rule Conditions table (WHERE clauses)
CREATE TABLE public.virtual_tag_rule_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL,
  condition_order INTEGER NOT NULL DEFAULT 1,
  field_name VARCHAR(255) NOT NULL, -- project_name, asset_name, asset_type, etc.
  operator VARCHAR(50) NOT NULL, -- 'equals', 'contains', 'not_equals', 'in', 'not_in', 'exists', 'not_exists'
  values TEXT[], -- Array of values to match against
  logical_operator VARCHAR(10) DEFAULT 'AND', -- 'AND' or 'OR' for combining with next condition
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_virtual_tag_rule_conditions_rule 
    FOREIGN KEY (rule_id) 
    REFERENCES virtual_tag_rules(id) 
    ON DELETE CASCADE
);

-- Create Virtual Tag Rule Actions table (THEN clauses)
CREATE TABLE public.virtual_tag_rule_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'custom_value' or 'megabill_key'
  custom_value VARCHAR(255), -- Static value when action_type = 'custom_value'
  megabill_key VARCHAR(255), -- Field name when action_type = 'megabill_key'
  tag_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for the tag
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_virtual_tag_rule_actions_rule 
    FOREIGN KEY (rule_id) 
    REFERENCES virtual_tag_rules(id) 
    ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.virtual_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tag_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tag_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_tag_rule_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for virtual_tags
CREATE POLICY "Users can view own virtual tags" 
ON public.virtual_tags 
FOR SELECT 
USING (configuracao_id IN (
  SELECT api_configuracaoidmc.id
  FROM api_configuracaoidmc
  WHERE api_configuracaoidmc.cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can create own virtual tags" 
ON public.virtual_tags 
FOR INSERT 
WITH CHECK (configuracao_id IN (
  SELECT api_configuracaoidmc.id
  FROM api_configuracaoidmc
  WHERE api_configuracaoidmc.cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can update own virtual tags" 
ON public.virtual_tags 
FOR UPDATE 
USING (configuracao_id IN (
  SELECT api_configuracaoidmc.id
  FROM api_configuracaoidmc
  WHERE api_configuracaoidmc.cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Users can delete own virtual tags" 
ON public.virtual_tags 
FOR DELETE 
USING (configuracao_id IN (
  SELECT api_configuracaoidmc.id
  FROM api_configuracaoidmc
  WHERE api_configuracaoidmc.cliente_id IN (
    SELECT profiles.cliente_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
));

-- Create RLS policies for virtual_tag_rules
CREATE POLICY "Users can view own virtual tag rules" 
ON public.virtual_tag_rules 
FOR SELECT 
USING (virtual_tag_id IN (
  SELECT vt.id
  FROM virtual_tags vt
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can create own virtual tag rules" 
ON public.virtual_tag_rules 
FOR INSERT 
WITH CHECK (virtual_tag_id IN (
  SELECT vt.id
  FROM virtual_tags vt
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can update own virtual tag rules" 
ON public.virtual_tag_rules 
FOR UPDATE 
USING (virtual_tag_id IN (
  SELECT vt.id
  FROM virtual_tags vt
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can delete own virtual tag rules" 
ON public.virtual_tag_rules 
FOR DELETE 
USING (virtual_tag_id IN (
  SELECT vt.id
  FROM virtual_tags vt
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

-- Create RLS policies for virtual_tag_rule_conditions
CREATE POLICY "Users can view own virtual tag rule conditions" 
ON public.virtual_tag_rule_conditions 
FOR SELECT 
USING (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can create own virtual tag rule conditions" 
ON public.virtual_tag_rule_conditions 
FOR INSERT 
WITH CHECK (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can update own virtual tag rule conditions" 
ON public.virtual_tag_rule_conditions 
FOR UPDATE 
USING (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can delete own virtual tag rule conditions" 
ON public.virtual_tag_rule_conditions 
FOR DELETE 
USING (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

-- Create RLS policies for virtual_tag_rule_actions
CREATE POLICY "Users can view own virtual tag rule actions" 
ON public.virtual_tag_rule_actions 
FOR SELECT 
USING (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can create own virtual tag rule actions" 
ON public.virtual_tag_rule_actions 
FOR INSERT 
WITH CHECK (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can update own virtual tag rule actions" 
ON public.virtual_tag_rule_actions 
FOR UPDATE 
USING (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

CREATE POLICY "Users can delete own virtual tag rule actions" 
ON public.virtual_tag_rule_actions 
FOR DELETE 
USING (rule_id IN (
  SELECT vtr.id
  FROM virtual_tag_rules vtr
  JOIN virtual_tags vt ON vtr.virtual_tag_id = vt.id
  WHERE vt.configuracao_id IN (
    SELECT api_configuracaoidmc.id
    FROM api_configuracaoidmc
    WHERE api_configuracaoidmc.cliente_id IN (
      SELECT profiles.cliente_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
));

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_virtual_tags_updated_at
BEFORE UPDATE ON public.virtual_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_virtual_tag_rules_updated_at
BEFORE UPDATE ON public.virtual_tag_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_virtual_tags_configuracao_id ON public.virtual_tags(configuracao_id);
CREATE INDEX idx_virtual_tag_rules_virtual_tag_id ON public.virtual_tag_rules(virtual_tag_id);
CREATE INDEX idx_virtual_tag_rule_conditions_rule_id ON public.virtual_tag_rule_conditions(rule_id);
CREATE INDEX idx_virtual_tag_rule_actions_rule_id ON public.virtual_tag_rule_actions(rule_id);