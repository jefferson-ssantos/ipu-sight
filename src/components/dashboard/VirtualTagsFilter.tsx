import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tags } from 'lucide-react';
import { useVirtualTags } from '@/hooks/useVirtualTags';

interface VirtualTagsFilterProps {
  selectedVirtualTag?: string;
  onVirtualTagChange: (virtualTagId: string) => void;
}

export function VirtualTagsFilter({ selectedVirtualTag, onVirtualTagChange }: VirtualTagsFilterProps) {
  const { virtualTags, loading } = useVirtualTags();

  if (loading || virtualTags.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Tags className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedVirtualTag || "none"} onValueChange={(value) => onVirtualTagChange(value === "none" ? "" : value)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Virtual Tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Sem filtro</span>
          </SelectItem>
          {virtualTags.map((tag) => (
            <SelectItem key={tag.id} value={tag.id}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {tag.virtual_tag_name}
                </Badge>
                {tag.description && (
                  <span className="text-xs text-muted-foreground truncate max-w-32">
                    {tag.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}