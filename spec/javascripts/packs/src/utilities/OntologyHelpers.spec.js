import expect from 'expect';
import { combineOntologyTrees, removeOntologyTreeId } from 'src/utilities/OntologyHelpers';

describe('combineOntologyTrees', () => {
  const chmo = { value: 'CHMO:0000593 | NMR', title: 'NMR' };
  const bao = { value: 'BAO:0000001 | bioassay', title: 'bioassay' };
  const recent = (children, value = 'recently selected') => ({
    title: '-- Recently selected --',
    value,
    selectable: false,
    children: children.map((node) => ({ ...node, value: ` ${node.value}` }))
  });

  it('combines CHMO and BAO with one history section without mutating either source', () => {
    const chmos = [recent([chmo]), chmo];
    const baos = [recent([bao], '-- Recently selected --'), bao];
    const original = JSON.stringify([chmos, baos]);

    expect(combineOntologyTrees(chmos, baos)).toEqual([recent([chmo, bao]), chmo, bao]);
    expect(JSON.stringify([chmos, baos])).toBe(original);
  });

  it('deduplicates BAO terms also present in legacy CHMO history', () => {
    const legacy = { ...bao, term_id: 'BAO:0000001' };
    expect(combineOntologyTrees([recent([legacy])], [recent([{ ...legacy }])])[0].children)
      .toEqual(recent([legacy]).children);
  });

  it('keeps terms when only one ontology has history', () => {
    expect(combineOntologyTrees([chmo], [recent([bao]), bao]))
      .toEqual([recent([bao]), chmo, bao]);
    expect(combineOntologyTrees([recent([chmo]), chmo], [bao]))
      .toEqual([recent([chmo]), chmo, bao]);
  });

  it('handles missing or empty sources while the ontologies load', () => {
    expect(combineOntologyTrees(null, [bao])).toEqual([bao]);
    expect(combineOntologyTrees([chmo], undefined)).toEqual([chmo]);
    expect(combineOntologyTrees([], null)).toEqual([]);
  });

  it('keeps shared imported terms selectable with unique, stable tree values', () => {
    const shared = { title: 'process', value: 'BFO:0000015 | process', key: 'BFO:0000015 | process' };
    const chmos = [{ ...chmo, children: [shared] }];
    const baos = [{ ...bao, children: [{ ...shared }] }];
    const result = combineOntologyTrees(chmos, baos);
    const chmoValue = result[0].children[0].value;
    const baoValue = result[1].children[0].value;

    expect(baoValue).not.toBe(chmoValue);
    expect(result[1].children[0].key).toBe(baoValue);
    expect(removeOntologyTreeId(baoValue)).toBe(shared.value);
    expect(combineOntologyTrees(chmos, baos)).toEqual(result);
    expect(baos[0].children[0].value).toBe(shared.value);
  });
});

describe('removeOntologyTreeId', () => {
  it('normalizes BAO values for saved analyses and search filters', () => {
    expect(removeOntologyTreeId('BAO:0002317 | quantum chemistry $550e8400-e29b-41d4-a716-446655440000'))
      .toBe('BAO:0002317 | quantum chemistry');
    expect(removeOntologyTreeId(' method with $ symbols ')).toBe('method with $ symbols');
    expect(removeOntologyTreeId()).toBe('');
  });
});
