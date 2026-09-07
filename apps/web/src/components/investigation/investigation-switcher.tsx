'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, ChevronDown } from 'lucide-react';
import { Dropdown, Button } from '@trinetra-pulse/ui';
import type { DropdownItem } from '@trinetra-pulse/ui';
import { getInvestigations } from '@/services/investigation.service';
import type { Investigation } from '@trinetra-pulse/types';

// ============================================================
// INVESTIGATION — SWITCHER
// ============================================================
// Context switcher for the open investigation. Lists every case and
// navigates the user to it. Uses a soft (client-side) navigation so
// the app shell transition plays; the detail page guarantees stale
// selections are cleared on switch.
// ============================================================

export function InvestigationSwitcher({
  currentId,
}: {
  currentId?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Investigation[] | null>(null);

  useEffect(() => {
    getInvestigations().then(setItems).catch(() => setItems([]));
  }, [currentId]);

  const dropdownItems: DropdownItem[] = (items ?? []).map((inv) => ({
    label: inv.title,
    icon: <FolderOpen className="h-3.5 w-3.5" />,
    value: inv.id,
    disabled: inv.id === currentId,
  }));

  return (
    <Dropdown
      align="end"
      trigger={
        <Button variant="secondary" size="sm" data-testid="investigation-switcher">
          <FolderOpen className="h-3.5 w-3.5" />
          Switch
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      }
      items={dropdownItems}
      onSelect={(item) => {
        if (item.value && item.value !== currentId) {
          router.push(`/investigations/${item.value}`);
        }
      }}
    />
  );
}
