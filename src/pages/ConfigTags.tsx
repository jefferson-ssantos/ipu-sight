import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Settings, Tags } from 'lucide-react';
import { TagManager } from '@/components/consumption/TagManager';

export default function ConfigTags() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Tags className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Tags Customizadas</h1>
            <p className="text-muted-foreground">
              Gerencie e organize suas tags personalizadas para categorização de assets
            </p>
          </div>
        </div>

        <TagManager />
      </div>
    </AppLayout>
  );
}