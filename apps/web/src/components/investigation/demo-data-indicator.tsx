'use client';

import { Database } from 'lucide-react';
import { isDemoMode } from '@/services/investigation-operations.service';
import { Badge, Tooltip } from '@trinetra-pulse/ui';

// ============================================================
// INVESTIGATION — DEMO DATA INDICATOR
// ============================================================
// Subtle, always-present marker that the environment is a sealed
// demo and all investigation-linked data is deterministic mock.
// ============================================================

export function DemoDataIndicator() {
  if (!isDemoMode()) return null;
  return (
    <Tooltip content="This build is a sealed demo. All intelligence and investigation data are deterministic mock records.">
      <Badge variant="outline" size="sm" data-testid="demo-data-indicator">
        <Database className="mr-1 h-3 w-3" />
        DEMO DATA
      </Badge>
    </Tooltip>
  );
}
