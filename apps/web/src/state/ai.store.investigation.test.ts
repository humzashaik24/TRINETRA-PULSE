import { useAIStore } from './ai.store';
import { aiInvestigationService } from '@/services/ai-investigation.service';
import type { AIResponse } from '@trinetra-pulse/types';

jest.mock('@/services/ai-investigation.service', () => ({
  aiInvestigationService: {
    answer: jest.fn(),
  },
}));

const mockedService = aiInvestigationService as jest.Mocked<typeof aiInvestigationService>;

const INV_006 = '6c887c98-939a-50ce-ac27-f58376941de2';
const OTHER = 'inv-other';

function responseFor(investigationId: string): AIResponse {
  return {
    id: 'ai-1',
    queryId: 'q1',
    status: 'complete',
    answer: `Answer grounded in ${investigationId}`,
    sources: [{ id: `Investigation:${investigationId}`, sourceId: `Investigation:${investigationId}`, sourceType: 'Investigation', label: 'Inv', relevance: 1 }],
    confidence: { answerGrounding: 0.9 },
    suggestedActions: [],
    incomplete: false,
    createdAt: new Date().toISOString(),
  };
}

describe('ai.store investigation scoping (real persisted data flow)', () => {
  const original = useAIStore.getState();

  beforeEach(() => {
    jest.resetAllMocks();
    useAIStore.setState({
      mode: 'panel',
      open: false,
      conversationId: null,
      investigationId: null,
      userId: null,
      title: 'Investigation assistant',
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
  });

  it('asks for the canonical investigation, then switching investigations clears all stale state', async () => {
    mockedService.answer.mockImplementation(async ({ scope }) => responseFor(scope.investigationId!));

    useAIStore.getState().setScope(INV_006);
    await useAIStore.getState().ask('Summarize Operation Meridian', { investigationId: INV_006 });

    const first = useAIStore.getState();
    expect(first.conversationId).toBeTruthy();
    expect(first.messages).toHaveLength(2);
    expect(first.lastScope?.investigationId).toBe(INV_006);
    expect(first.investigationId).toBe(INV_006);

    useAIStore.getState().setScope(OTHER);

    const switched = useAIStore.getState();
    expect(switched.investigationId).toBe(OTHER);
    // No conversation/context/stale state may leak across investigations.
    expect(switched.conversationId).toBeNull();
    expect(switched.messages).toHaveLength(0);
    expect(switched.lastScope).toBeNull();
    expect(switched.pendingActions).toHaveLength(0);
    expect(switched.streamingText).toBe('');
  });

  it('a follow-up ask after switching is scoped to the new investigation', async () => {
    mockedService.answer.mockImplementation(async ({ scope }) => responseFor(scope.investigationId!));

    useAIStore.getState().setScope(INV_006);
    await useAIStore.getState().ask('Who is involved?', { investigationId: INV_006 });
    useAIStore.getState().setScope(OTHER);
    await useAIStore.getState().ask('Which evidence?', { investigationId: OTHER });

    expect(mockedService.answer).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: { investigationId: OTHER } })
    );
    const lastMessage = useAIStore.getState().messages.at(-1);
    expect(lastMessage?.content).toContain('inv-other');
  });

  it('newConversation drops the asserted context scope', async () => {
    mockedService.answer.mockResolvedValue(responseFor(INV_006));
    await useAIStore.getState().ask('Summary', { investigationId: INV_006 });

    const s = useAIStore.getState();
    expect(s.lastScope?.investigationId).toBe(INV_006);

    useAIStore.getState().newConversation();
    const cleared = useAIStore.getState();
    expect(cleared.lastScope).toBeNull();
    expect(cleared.messages).toHaveLength(0);
    expect(cleared.conversationId).toBeNull();
    expect(cleared.title).toBe('Investigation assistant');
  });
});