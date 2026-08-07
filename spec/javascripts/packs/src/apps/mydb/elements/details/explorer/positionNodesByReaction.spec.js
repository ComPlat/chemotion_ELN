import expect from 'expect';

import positionNodesByReaction from 'src/apps/mydb/elements/details/explorer/positionNodesByReaction';

describe('positionNodesByReaction', () => {
  // Sample 2 is the product of reaction 10 and the starting material of reaction 20 —
  // the multi-step-synthesis case that used to push two competing `sample-2` nodes.
  const samples = [
    { id: 1, ancestry: null, molecule_id: null, name: 'A', short_label: 'A' },
    { id: 2, ancestry: null, molecule_id: null, name: 'B', short_label: 'B' },
    { id: 3, ancestry: null, molecule_id: null, name: 'C', short_label: 'C' },
  ];
  const reactions = [
    {
      id: 10,
      name: 'R1',
      short_label: 'R1',
      starting_material_ids: [1],
      reactant_ids: [],
      product_ids: [2],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 20,
      name: 'R2',
      short_label: 'R2',
      starting_material_ids: [2],
      reactant_ids: [],
      product_ids: [3],
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    },
  ];

  it('emits exactly one node per sample even when it is both a product and a starting material', () => {
    const { nodes } = positionNodesByReaction(samples, reactions, []);
    const sample2Nodes = nodes.filter((n) => n.id === 'sample-2');

    expect(sample2Nodes.length).toBe(1);
  });

  it('keeps the chain connected: edges into and out of the shared sample both exist', () => {
    const { edges } = positionNodesByReaction(samples, reactions, []);

    expect(edges.some((e) => e.source === 'reaction-10' && e.target === 'sample-2')).toBe(true);
    expect(edges.some((e) => e.source === 'sample-2' && e.target === 'reaction-20')).toBe(true);
  });

  it('produces one node per distinct sample id overall', () => {
    const { nodes } = positionNodesByReaction(samples, reactions, []);
    const sampleNodeIds = nodes.filter((n) => n.type === 'sample').map((n) => n.id);
    const uniqueIds = new Set(sampleNodeIds);

    expect(sampleNodeIds.length).toBe(uniqueIds.size);
  });
});
