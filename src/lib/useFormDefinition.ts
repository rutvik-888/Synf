import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FormDefinitionRow } from '@/lib/types';

export function useFormDefinition(formKey: 'contact' | 'collaboration') {
  const [formDef, setFormDef] = useState<FormDefinitionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('form_definitions')
        .select('*')
        .eq('form_key', formKey)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setFormDef(data as FormDefinitionRow | null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [formKey]);

  return { formDef, loading };
}
