import { render, screen } from '@testing-library/react';
import { KnowledgeCanvasGateway } from '@/components/knowledge-canvas/gateway';
import { resetCanvasStore } from '@/components/knowledge-canvas/canvas-store';

// The gateway route must stay lightweight: a single primary action that
// links into the dedicated (lazy-loaded) canvas route, preserving the
// active investigation in the journey query parameter.

describe('KnowledgeCanvasGateway', () => {
  beforeEach(() => {
    resetCanvasStore();
  });

  it('renders the gateway title and capability summary', () => {
    render(<KnowledgeCanvasGateway />);
    expect(screen.getByRole('heading', { name: /knowledge canvas/i })).toBeInTheDocument();
    expect(screen.getByText(/visual investigation workspace/i)).toBeInTheDocument();
  });

  it('offers a single primary OPEN CANVAS action linking to the canvas route', () => {
    render(<KnowledgeCanvasGateway />);
    const open = screen.getByTestId('open-canvas');
    expect(open).toBeInTheDocument();
    expect(open).toHaveTextContent(/open canvas/i);
    expect(open).toHaveAttribute('href', '/knowledge-canvas/canvas?i=inv-demo-nexus');
  });

  it('does not load the heavy canvas viewport on the gateway', () => {
    render(<KnowledgeCanvasGateway />);
    expect(screen.queryByTestId('canvas-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('canvas-graph')).not.toBeInTheDocument();
  });

  it('shows the active investigation name scoped to the canvas', () => {
    render(<KnowledgeCanvasGateway />);
    expect(screen.getByText(/Operation Trinetra Nexus/i)).toBeInTheDocument();
  });
});