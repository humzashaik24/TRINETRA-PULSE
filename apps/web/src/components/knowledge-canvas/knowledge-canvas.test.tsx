import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { KnowledgeCanvasWorkspace } from '@/components/knowledge-canvas/knowledge-canvas-workspace';
import { useAppStore } from '@/state/app.store';
import { useAuthStore } from '@/state/auth.store';
import { useGraphStore } from '@/state/graph.store';

// Stub the corpus loader so the legal tab performs a deterministic
// offline search without any network or /data fetch in jsdom.
jest.mock('@/lib/legal/legal-corpus', () => ({
  LEGAL_CORPUS_PATH: '/data/indic-legal-qa.json',
  loadLegalCorpus: jest.fn(async () => [
    {
      case_name: 'Union of India vs. Maj. Gen. Manomoy Ganguly',
      judgement_date: '1st August 2018',
      question:
        'What decision did the Armed Forces Tribunal (AFT) make regarding promotion?',
      answer:
        'The AFT directed the appellants to post Maj. Gen. Manomoy Ganguly as DGMS (Army).',
    },
  ]),
  resetLegalCorpusCache: jest.fn(),
}));

// ============================================================
// KNOWLEDGE CANVAS — WORKSPACE SMOKE TEST
// ============================================================
// Exercises the Tier-1 workspace shell: tab structure, the CDR/CSV
// import → parse → expand loop, and the network / report / legal
// previews. The interactive @xyflow graph itself is out of scope for
// jsdom (same convention as the networks page test), so loadNetwork is
// stubbed and the ready state is never reached.
// ============================================================

// Stub loadNetwork so the graph preview never resolves into the
// interactive @xyflow/react renderer.
const noopLoad = jest.fn(async () => {});
const DEMO_SESSION = {
  access_token: 'mock-token.investigator',
  user: {
    id: 'mock-investigator',
    email: 'investigator@trinetra.dev',
    display_name: 'Investigator',
    role: 'investigator' as const,
    is_active: true,
  },
};

beforeEach(() => {
  useAuthStore.setState({
    session: DEMO_SESSION,
    status: 'authenticated',
    hydrated: true,
    error: null,
  });
  useGraphStore.setState({
    loadNetwork: noopLoad,
    clearNetwork: noopLoad,
    loadingState: 'idle',
    error: null,
    networkId: null,
  });
});

afterEach(() => {
  cleanup();
  useAppStore.setState({ contextLabel: null, language: 'en' });
  useAuthStore.setState({ session: null, status: 'unauthenticated', hydrated: true });
  useGraphStore.setState({
    loadingState: 'idle',
    error: null,
    networkId: null,
  });
});

function renderWorkspace() {
  render(<KnowledgeCanvasWorkspace />);
}

describe('KnowledgeCanvasWorkspace', () => {
  it('renders the workspace shell with all four capability tabs, scoped to the demo investigation', () => {
    renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Knowledge Canvas' })).toBeInTheDocument();
    expect(screen.getByText('INV-DEMO-NEXUS')).toBeInTheDocument();
    expect(screen.getByText('Operation Trinetra Nexus')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'CDR / CSV' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Network' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Legal Research' })).toBeInTheDocument();

    expect(screen.getByText('Import a communication or transaction CSV')).toBeInTheDocument();
    expect(useAppStore.getState().contextLabel).toBe('Knowledge Canvas');
  });

  it('loads the CDR sample, reports the parse, and expands the network deterministically', async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /Load CDR sample/i }));

    expect(await screen.findAllByText('Communication CDR')).not.toHaveLength(0);
    expect(screen.getByText('Records parsed')).toBeInTheDocument();
    expect(screen.getByText('Rows skipped')).toBeInTheDocument();
    expect(screen.getByText('+3 more rows hidden in preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Expand network/i }));
    expect(await screen.findByText('Nodes created')).toBeInTheDocument();
    expect(screen.getByText('Expansion summary')).toBeInTheDocument();
    expect(screen.getByText('Records: 11 communication · 0 transactions')).toBeInTheDocument();
    expect(screen.getByText('Matched existing entities')).toBeInTheDocument();
    expect(noopLoad).not.toHaveBeenCalled();
  });

  it('surfaces the network preview and deep link into the network workspace', async () => {
    useGraphStore.setState({ loadingState: 'loading', networkId: 'NET-004' });
    renderWorkspace();

    fireEvent.click(screen.getByRole('tab', { name: 'Network' }));

    expect(await screen.findByText('Network graph')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open in Network Workspace/i });
    expect(link).toHaveAttribute('href', '/networks/NET-004?i=inv-demo-nexus');
    expect(screen.getByText('Building network…')).toBeInTheDocument();
  });

  it('compiles the investigation report and performs offline legal research', async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole('tab', { name: 'Report' }));
    expect(await screen.findByText('Evidence integrity ledger')).toBeInTheDocument();
    expect(screen.getByText('Network profile & centrality')).toBeInTheDocument();
    expect(screen.getByText('Key findings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Legal Research' }));
    expect(await screen.findByText('How retrieval works')).toBeInTheDocument();
    expect(screen.getByText('1 entries loaded')).toBeInTheDocument();

    const input = screen.getByLabelText('Legal research query');
    fireEvent.change(input, { target: { value: 'promotion tribunal' } });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    expect(await screen.findByText('Citations')).toBeInTheDocument();
    expect(
      screen.getByText(
        'What decision did the Armed Forces Tribunal (AFT) make regarding promotion?'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The AFT directed the appellants to post Maj. Gen. Manomoy Ganguly as DGMS (Army).'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Union of India vs\. Maj\. Gen\. Manomoy Ganguly/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'zzqxyz nonexistent' } });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    expect(await screen.findByText('No matching citations')).toBeInTheDocument();
  });

  it('localizes the workspace chrome when the language is switched to हिंदी', () => {
    useAppStore.setState({ language: 'hi' });
    renderWorkspace();

    expect(
      screen.getByRole('heading', { name: 'नॉलेज कैनवास' })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'सीडीआर / सीएसवी' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'नेटवर्क' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'रिपोर्ट' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'कानूनी शोध' })).toBeInTheDocument();
    expect(screen.getByText(/कच्चे संचार डेटा से/)).toBeInTheDocument();
    expect(useAppStore.getState().contextLabel).toBe('नॉलेज कैनवास');
  });
});