import expect from 'expect';
import { buildMofid, mofResultFromAnalysis, patchMofDetails } from 'src/components/mof/mofUtils';

const response = {
  mofid: '[Cu][Cu].O=C=O MOFid-v1.tbo.cat0.mofidwrapper0.1.0-mofid36873683;P1-Cu-BTC',
  mofkey: 'Cu.X.MOFkey-v1.tbo.mofidwrapper0.1.0-mofid36873683',
  smiles_nodes: '[Cu][Cu]',
  smiles_linkers: 'O=C=O',
  topology: 'tbo',
  cat: '0',
  node_ratios: [3],
  linker_ratios: [4],
};

describe('MOF analysis mapping', () => {
  it('preserves the full converter identifiers, including version and structure name', () => {
    const mof = mofResultFromAnalysis(response);
    expect(mof.mofid).toEqual(response.mofid);
    expect(mof.mofkey).toEqual(response.mofkey);
  });

  it('preserves a returned MOFkey reference token', () => {
    expect(mofResultFromAnalysis({ ...response, mofkey: 'Cu.X.MOFkey-v1.tbo.NO_REF' }).mofkey)
      .toEqual('Cu.X.MOFkey-v1.tbo.NO_REF');
  });

  it('keeps undetermined and absent ratios distinct from a known ratio of one', () => {
    const mof = mofResultFromAnalysis({
      ...response, smiles_nodes: '[Cu].[Zn]', node_ratios: [1], linker_ratios: '',
    });
    expect(mof.fragments.map((frag) => frag.ratio)).toEqual([1, null, null]);
  });

  it('keeps node and linker ratios aligned with their building blocks', () => {
    const mof = mofResultFromAnalysis({ ...response, smiles_nodes: '[Cu].[Zn]', node_ratios: [3, 1] });
    expect(mof.fragments.map(({ smiles, ratio }) => [smiles, ratio]))
      .toEqual([['[Cu]', 3], ['[Zn]', 1], ['O=C=O', 4]]);
  });
});

describe('MOF details edits', () => {
  it('preserves the full MOFid when editing metadata or fragment ratios', () => {
    const mof = mofResultFromAnalysis(response);
    const next = patchMofDetails(mof, {
      substrate: 'Glass',
      fragments: mof.fragments.map((frag) => ({ ...frag, ratio: 6, comment: 'Adjusted' })),
    });
    expect(next.mofid).toEqual(response.mofid);
    expect(next.substrate).toEqual('Glass');
    expect(mof.fragments[0].ratio).toEqual(3);
  });

  it('derives a new identifier when the structural inputs change', () => {
    const mof = mofResultFromAnalysis(response);
    const next = patchMofDetails(mof, { topology: 'pcu' });
    expect(next.mofid).toEqual('[Cu][Cu].O=C=O MOFid-v1.pcu.cat0');
    expect(next.mofid).toEqual(buildMofid(next));
    expect(mof.mofid).toEqual(response.mofid);
  });
});
