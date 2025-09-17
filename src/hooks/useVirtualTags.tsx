import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface VirtualTag {
  id: string;
  virtual_tag_name: string;
  description: string | null;
  active: boolean;
}

export function useVirtualTags() {
  const { user } = useAuth();
  const [virtualTags, setVirtualTags] = useState<VirtualTag[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch active virtual tags
      const { data: tags, error } = await supabase
        .from('virtual_tags')
        .select('id, virtual_tag_name, description, active')
        .in('configuracao_id', configs.map(c => c.id))
        .eq('active', true)
        .order('virtual_tag_name');

      if (error) {
        console.error('Error fetching virtual tags:', error);
        throw error;
      }

      setVirtualTags(tags || []);
    } catch (error) {
      console.error('Error in fetchVirtualTags:', error);
    } finally {
      setLoading(false);
    }
  };

  return { virtualTags, loading, refetch: fetchVirtualTags };
}