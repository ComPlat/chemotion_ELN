import expect from 'expect';
import sinon from 'sinon';
import Sample from 'src/models/Sample';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import Attachment from 'src/models/Attachment';
import {
  MOF_CIF_ANALYSIS_NAME, MOF_CIF_MARKER, attachMofCif, buildMofid, detachMofCif, mofResultFromAnalysis, patchMofDetails,
  resolveFragmentIdentifiers,
} from 'src/components/mof/mofUtils';

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

describe('MOF fragment identifiers', () => {
  afterEach(() => sinon.restore());

  it('does not store the molfile of a resolved building block', async () => {
    sinon.stub(MoleculesFetcher, 'fetchBySmi').resolves({
      id: 7, iupac_name: 'copper', inchikey: 'KEY', molfile: 'large molfile', molecule_svg_file: 'cu.svg',
    });
    const patch = await resolveFragmentIdentifiers('[Cu][Cu]');
    expect(patch).toMatchObject({ molecule_id: 7, inchikey: 'KEY', svg_file: 'cu.svg' });
    expect(patch.molfile).toEqual(undefined);
  });
});

describe('MOF CIF attachment', () => {
  const cif = (name) => ({ name, size: 10 });
  const analyses = (sample) => sample.analysesContainers()[0].children;
  const mofAnalyses = (sample) => analyses(sample).filter((child) => child.extended_metadata[MOF_CIF_MARKER] === 'true');
  const files = (sample) => mofAnalyses(sample)[0].children[0].attachments;
  const save = (attachment) => { attachment.is_new = false; };

  it('creates one marked XRD analysis with a dataset holding the uploaded CIF', () => {
    const sample = Sample.buildEmpty(1);
    attachMofCif(sample, cif('first.cif'));

    expect(mofAnalyses(sample).length).toEqual(1);
    expect(mofAnalyses(sample)[0].name).toEqual(MOF_CIF_ANALYSIS_NAME);
    expect(mofAnalyses(sample)[0].extended_metadata.kind).toContain('X-ray diffraction');
    expect(mofAnalyses(sample)[0].children[0].container_type).toEqual('dataset');
    expect(files(sample).map((att) => att.filename)).toEqual(['first.cif']);
  });

  it('finds the analysis by its marker after the user renames it', () => {
    const sample = Sample.buildEmpty(1);
    attachMofCif(sample, cif('first.cif'));
    mofAnalyses(sample)[0].name = 'Renamed by user';
    attachMofCif(sample, cif('second.cif'), 'first.cif');

    expect(mofAnalyses(sample).length).toEqual(1);
    expect(files(sample).map((att) => att.filename)).toEqual(['second.cif']);
  });

  it('keeps a saved CIF as history when a new one is uploaded', () => {
    const sample = Sample.buildEmpty(1);
    attachMofCif(sample, cif('first.cif'));
    save(files(sample)[0]);
    attachMofCif(sample, cif('second.cif'), 'first.cif');

    expect(files(sample).map((att) => [att.filename, att.is_deleted])).toEqual([
      ['first.cif', false], ['second.cif', false],
    ]);
  });

  it('leaves files the user added to the analysis alone', () => {
    const sample = Sample.buildEmpty(1);
    attachMofCif(sample, cif('first.cif'));
    files(sample).push(Attachment.fromFile({ name: 'notes.txt', size: 1 }));
    attachMofCif(sample, cif('second.cif'), 'first.cif');

    expect(files(sample).map((att) => att.filename)).toEqual(['notes.txt', 'second.cif']);
  });

  it('drops an unsaved CIF and its new, empty analysis on Clear', () => {
    const sample = Sample.buildEmpty(1);
    attachMofCif(sample, cif('first.cif'));
    detachMofCif(sample, 'first.cif');

    expect(mofAnalyses(sample).length).toEqual(0);
  });

  it('keeps a saved CIF on Clear', () => {
    const sample = Sample.buildEmpty(1);
    attachMofCif(sample, cif('first.cif'));
    mofAnalyses(sample)[0].is_new = false;
    save(files(sample)[0]);
    detachMofCif(sample, 'first.cif');

    expect(files(sample).map((att) => [att.filename, att.is_deleted])).toEqual([['first.cif', false]]);
  });
});
