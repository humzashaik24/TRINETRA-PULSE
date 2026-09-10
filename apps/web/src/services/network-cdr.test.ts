import { buildCdrNetworkExpansion } from '@/services/network.service';
import { parseCdrCsv } from '@/lib/cdr/cdr-parse';
import { SAMPLE_CDR_CSV, SAMPLE_CDR_FILE_NAME, SAMPLE_TRANSACTION_CSV } from '@/mock/cdr-sample';
import { networkClean } from '@/mock/networks';

describe('buildCdrNetworkExpansion', () => {
  it('returns an unchanged projection for empty input', () => {
    const expansion = buildCdrNetworkExpansion({ graph: networkClean, records: [], datasetName: 'empty' });
    expect(expansion.graph.nodes).toHaveLength(networkClean.nodes.length);
    expect(expansion.graph.edges).toHaveLength(networkClean.edges.length);
    expect(expansion.nodesCreated).toHaveLength(0);
  });

  it('creates new phone nodes and edges from the CDR sample', () => {
    const parsed = parseCdrCsv(SAMPLE_CDR_CSV);
    const expansion = buildCdrNetworkExpansion({
      graph: networkClean,
      records: parsed.records,
      datasetName: SAMPLE_CDR_FILE_NAME,
    });

    const phonesCreated = expansion.nodesCreated.filter((n) => n.type === 'phone');
    expect(phonesCreated).toHaveLength(2); // 76700 11223 + 96990 50001
    expect(phonesCreated.map((n) => n.label)).toEqual(
      expect.arrayContaining(['+91 76700 11223', '+91 96990 50001'])
    );

    // Every existing known phone was matched, never duplicated.
    expect(expansion.graph.nodes.filter((n) => n.type === 'phone')).toHaveLength(
      networkClean.nodes.filter((n) => n.type === 'phone').length + 2
    );
    expect(expansion.matchedExisting.some((n) => n.entityId === 'ent-phone-001')).toBe(true);

    const newEdges = expansion.graph.edges.filter((e) => e.id.includes('-cdr-e-'));
    expect(newEdges.length).toBeGreaterThan(0);
    expect(newEdges.every((e) => e.type === 'KNOWS')).toBe(true);

    // 11 records, 11 distinct pairs -> 11 new KNOWS edges.
    expect(newEdges).toHaveLength(11);
  });

  it('creates account nodes + SENT_TRANSACTION edges from the transaction sample', () => {
    const parsed = parseCdrCsv(SAMPLE_TRANSACTION_CSV);
    const expansion = buildCdrNetworkExpansion({
      graph: networkClean,
      records: parsed.records,
      datasetName: 'tx-sample',
    });

    const accountsCreated = expansion.nodesCreated.filter((n) => n.type === 'account');
    expect(accountsCreated).toHaveLength(1); // 9988 2211 4400 only
    expect(accountsCreated[0].label).toBe('9988 2211 4400');

    expect(expansion.matchedExisting.some((n) => n.entityId === 'ent-account-001')).toBe(true);

    const txEdges = expansion.graph.edges.filter((e) => e.id.includes('-cdr-e-'));
    expect(txEdges).toHaveLength(5);
    expect(txEdges.every((e) => e.type === 'SENT_TRANSACTION' && e.direction === 'directed')).toBe(true);
  });

  it('is idempotent when the same record set is applied twice-like (dedupe per pair)', () => {
    const parsed = parseCdrCsv(SAMPLE_CDR_CSV);
    const one = buildCdrNetworkExpansion({ graph: networkClean, records: parsed.records, datasetName: 'd1' });
    // Re-applying the same imports onto the projected graph adds no duplicate edges.
    const two = buildCdrNetworkExpansion({ graph: one.graph, records: parsed.records, datasetName: 'd2' });
    expect(two.graph.edges.filter((e) => e.id.includes('-cdr-e-'))).toHaveLength(11);
    expect(two.graph.edges).toHaveLength(one.graph.edges.length);
  });

  it('recomputes node degree after expansion', () => {
    const parsed = parseCdrCsv(SAMPLE_CDR_CSV);
    const expansion = buildCdrNetworkExpansion({ graph: networkClean, records: parsed.records, datasetName: SAMPLE_CDR_FILE_NAME });
    const phone = expansion.graph.nodes.find((n) => n.entityId === 'ent-phone-001');
    expect(phone?.connections).toBeGreaterThan(0);
  });
});