import { useAIStore, registerAIActionListener, unregisterAIActionListener } from './ai.store';

describe('ai.store', () => {
  const original = useAIStore.getState();
  beforeEach(() => {
    useAIStore.setState({
      mode: 'panel',
      open: false,
      conversationId: null,
      investigationId: null,
      userId: null,
      messages: [],
      status: 'active',
      isAsking: false,
      streamState: 'idle',
      streamingText: '',
      lastError: null,
      lastScope: null,
      pendingActions: [],
    });
  });
  afterAll(() => {
    useAIStore.setState(original);
    unregisterAIActionListener();
  });

  it('opens/closes the panel', () => {
    const s = useAIStore.getState();
    s.openPanel('panel');
    expect(useAIStore.getState().open).toBe(true);
    expect(useAIStore.getState().mode).toBe('panel');
    s.closePanel();
    expect(useAIStore.getState().open).toBe(false);
  });

  it('resets the conversation when the investigation changes', () => {
    const s = useAIStore.getState();
    s.setScope('inv-1');
    s.openPanel('panel');
    useAIStore.setState({
      messages: [{ id: 'm1', conversationId: 'c1', role: 'user', content: 'hi', createdAt: 'x' }],
      conversationId: 'c1',
    });
    s.setScope('inv-2');
    expect(useAIStore.getState().investigationId).toBe('inv-2');
    expect(useAIStore.getState().messages).toHaveLength(0);
    expect(useAIStore.getState().conversationId).toBeNull();
  });

  it('keeps the conversation when scoping to the same investigation', () => {
    const s = useAIStore.getState();
    s.setScope('inv-1');
    useAIStore.setState({ conversationId: 'c1' });
    s.setScope('inv-1');
    expect(useAIStore.getState().conversationId).toBe('c1');
  });

  it('never appends a stale assistant answer after the investigation changed', async () => {
    const s = useAIStore.getState();
    s.setScope('inv-999');
    const promise = s.ask('Who is the alias?', { investigationId: 'inv-001' });
    s.setScope('inv-888');
    const ok = await promise;
    const after = useAIStore.getState();
    expect(ok).toBe(false);
    expect(after.investigationId).toBe('inv-888');
    expect(after.isAsking).toBe(false);
    expect(after.streamState).toBe('complete');
    expect(after.messages.some((m) => m.role === 'assistant')).toBe(false);
  });

  it('newConversation clears messages and pending actions', () => {
    useAIStore.setState({
      conversationId: 'c1',
      title: 'Some title',
      messages: [{ id: 'm1', conversationId: 'c1', role: 'user', content: 'x', createdAt: 'x' }],
      pendingActions: [{ id: 'a1', type: 'OPEN_ENTITY', label: 'Open', status: 'available' }],
    });
    useAIStore.getState().newConversation();
    expect(useAIStore.getState().messages).toHaveLength(0);
    expect(useAIStore.getState().conversationId).toBeNull();
    expect(useAIStore.getState().pendingActions).toHaveLength(0);
    expect(useAIStore.getState().title).toBe('Investigation assistant');
  });

  it('bounds panel width via setWidth', () => {
    useAIStore.getState().setWidth(200);
    expect(useAIStore.getState().width).toBe(300);
    useAIStore.getState().setWidth(2000);
    expect(useAIStore.getState().width).toBe(520);
  });

  it('forwards read-only actions to a registered host listener', async () => {
    const seen: string[] = [];
    registerAIActionListener((a) => seen.push(a.type));
    useAIStore.setState({
      pendingActions: [{ id: 'a1', type: 'OPEN_ENTITY', label: 'Open', status: 'available' }],
    });
    useAIStore.getState().runAction({
      id: 'a1',
      type: 'OPEN_ENTITY',
      label: 'Open',
      target: { entityId: 'ent-1' },
      status: 'available',
    });
    await Promise.resolve();
    expect(seen).toContain('OPEN_ENTITY');
    unregisterAIActionListener();
  });
});
