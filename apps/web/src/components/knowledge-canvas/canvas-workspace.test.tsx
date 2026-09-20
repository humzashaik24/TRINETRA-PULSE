import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { CanvasWorkspace } from '@/components/knowledge-canvas/canvas-workspace';
import { useCanvasStore, resetCanvasStore } from '@/components/knowledge-canvas/canvas-store';
import { DEMO_INVESTIGATION_ID } from '@/navigation/journey';
import { queryAssistant } from '@/lib/api/assistant';
import type { AIResponse } from '@trinetra-pulse/types';

jest.mock('@xyflow/react', () => jest.requireActual('@/test/mocks/xyflow'));
jest.mock('@/lib/api/assistant', () => ({
  queryAssistant: jest.fn(),
}));

const mockedQuery = jest.mocked(queryAssistant);

const SAMPLE_RESPONSE: AIResponse = {
  id: 'ai-1',
  queryId: 'q-1',
  status: 'complete',
  answer: 'The link is supported by two shared contacts.',
  keyPoints: [],
  sources: [{ id: 's1', sourceType: 'Evidence', sourceId: 'ev-1', label: 'Transcript', relevance: 1 }],
  confidence: { answerGrounding: 0.9 },
  limitations: [],
  suggestedActions: [],
  incomplete: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('CanvasWorkspace', () => {
  beforeEach(() => {
    resetCanvasStore();
    mockedQuery.mockReset();
    mockedQuery.mockResolvedValue(SAMPLE_RESPONSE);
  });

  async function renderWorkspace() {
    render(<CanvasWorkspace />);
    await waitFor(() => {
      expect(useCanvasStore.getState().loaded).toBe(true);
    });
  }

  it('seeds the canvas from the demo investigation (entities + evidence)', async () => {
    await renderWorkspace();
    const state = useCanvasStore.getState();
    expect(state.investigationId).toBe(DEMO_INVESTIGATION_ID);
    expect(state.nodes.length).toBeGreaterThan(0);
    expect(state.edges.length).toBeGreaterThan(0);
    expect(state.dataSource).toBe('demo');
    expect(state.nodes.some((n) => n.data.kind === 'entity')).toBe(true);
    expect(state.nodes.some((n) => n.data.kind === 'evidence')).toBe(true);
    expect(screen.getByTestId('canvas-graph')).toBeInTheDocument();
  });

  it('renders the canvas workspace chrome: toolbar, tabs, exit action', async () => {
    await renderWorkspace();
    expect(screen.getByTestId('canvas-workspace')).toBeInTheDocument();
    for (const tab of ['graph', 'network', 'directions', 'report', 'legal', 'visualization', 'audit', 'settings']) {
      expect(screen.getByTestId(`canvas-tab-${tab}`)).toBeInTheDocument();
    }
    const exit = screen.getByTestId('exit-canvas');
    expect(exit).toHaveAttribute('href', `/knowledge-canvas?i=${DEMO_INVESTIGATION_ID}`);
  });

  it('navigates between canvas views without leaving the workspace', async () => {
    await renderWorkspace();
    fireEvent.click(screen.getByTestId('canvas-tab-network'));
    await waitFor(() => {
      expect(screen.getByTestId('canvas-network-view')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('canvas-tab-report'));
    await waitFor(
      () => {
        expect(screen.getByTestId('canvas-report-view')).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
    fireEvent.click(screen.getByTestId('canvas-tab-audit'));
    expect(screen.getByTestId('canvas-audit-view')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('canvas-tab-graph'));
    expect(screen.getByTestId('canvas-graph')).toBeInTheDocument();
  });

  it('inspector surfaces node details and an Analyze with AI action for evidence', async () => {
    await renderWorkspace();
    const evidenceNode = useCanvasStore.getState().nodes.find((n) => n.data.kind === 'evidence');
    expect(evidenceNode).toBeDefined();
    act(() => {
      useCanvasStore.getState().selectNode(evidenceNode!.id);
    });
    expect(screen.getByTestId('node-inspector')).toBeInTheDocument();
    expect(screen.getAllByText(/Evidence/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /analyze with ai/i }));
    await waitFor(() => {
      expect(useCanvasStore.getState().aiOpen).toBe(true);
    });
  });

  it('grounded AI panel answers through queryAssistant and renders sources', async () => {
    await renderWorkspace();
    const input = screen.getByTestId('canvas-ai-input');
    fireEvent.change(input, { target: { value: 'Why are these entities linked?' } });
    fireEvent.click(screen.getByTestId('canvas-ai-send'));
    await waitFor(() => {
      expect(mockedQuery).toHaveBeenCalledTimes(1);
    });
    const call = mockedQuery.mock.calls[0][0];
    expect(call.scope.investigation_id).toBe(DEMO_INVESTIGATION_ID);
    await waitFor(() => {
      expect(screen.getByText(SAMPLE_RESPONSE.answer)).toBeInTheDocument();
    });
    expect(screen.getByTestId('canvas-ai-message-assistant')).toBeInTheDocument();
  });

  it('ingest opens the import modal from the toolbar', async () => {
    await renderWorkspace();
    fireEvent.click(screen.getByTestId('canvas-import'));
    expect(screen.getByTestId('canvas-import-modal')).toBeInTheDocument();
  });

  it('settings overlay toggles canvas rendering preferences', async () => {
    await renderWorkspace();
    expect(useCanvasStore.getState().minimap).toBe(true);
    fireEvent.click(screen.getByTestId('canvas-settings'));
    expect(screen.getByTestId('canvas-settings-panel')).toBeInTheDocument();
    const toggles = screen.getAllByRole('checkbox');
    fireEvent.click(toggles[0]);
    await waitFor(() => {
      expect(useCanvasStore.getState().minimap).toBe(false);
    });
  });
});
