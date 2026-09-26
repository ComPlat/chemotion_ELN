import expect from 'expect';
import { FN } from '@complat/react-spectra-editor';
import {
  isNMRKind, BuildSpcInfosForNMRDisplayer,
  JcampIds, BuildSpcInfos, cleaningNMRiumData, spectrumName,
  inlineNotation,
} from 'src/utilities/SpectraHelper';
import Sample from 'src/models/Sample';
import Container from 'src/models/Container';
import { chmosFixture } from 'fixture/chmos';

describe('SpectraHelper', () => {
  describe('.isNMRKind()', () => {
    describe('when container is null or undefined:', () => {
      it('container is null', () => {
        expect(isNMRKind(null)).toEqual(false);
      });

      it('container is undefined', () => {
        expect(isNMRKind(undefined)).toEqual(false);
      });
    });

    describe('when container is neither not null nor undefined:', () => {
      it('when container does not has extended_metadata', () => {
        const container = 'Just a random value';
        expect(isNMRKind(container)).toEqual(false);
      });

      describe('when container has extended_metadata', () => {
        it('metadata does not has kind value', () => {
          const container = { extended_metadata: {} };
          expect(isNMRKind(container)).toEqual(false);
        });

        it('metadata has kind value but it is not NMR type', () => {
          const container = { extended_metadata: { kind: 'Mass spectrum' } };
          expect(isNMRKind(container)).toEqual(false);
        });

        it('it is NMR type when list ontologies is empty', () => {
          const container = { extended_metadata: { kind: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)' } };
          expect(isNMRKind(container, [])).toEqual(false);
        });

        it('it is NMR type when having list ontologies', () => {
          const containers = [
            { extended_metadata: { kind: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)' } },
            { extended_metadata: { kind: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' } },
            { extended_metadata: { kind: 'CHMO:0000567 | 15N nuclear magnetic resonance spectroscopy (15N NMR)' } },
            { extended_metadata: { kind: 'CHMO:0001151 | 1H--1H nuclear Overhauser enhancement spectroscopy (1H-1H NOESY)' } },
            { extended_metadata: { kind: 'CHMO:0001173 | 13C--13C nuclear Overhauser enhancement spectroscopy (13C-13C NOESY)' } },
          ];
          containers.forEach((container) => {
            expect(isNMRKind(container, chmosFixture)).toEqual(true);
          });
        });

        it('it is NMR type but list ontologies is invalid', () => {
          const containers = [
            { extended_metadata: { kind: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)' } },
            { extended_metadata: { kind: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' } },
            { extended_metadata: { kind: 'CHMO:0000567 | 15N nuclear magnetic resonance spectroscopy (15N NMR)' } },
            { extended_metadata: { kind: 'CHMO:0001151 | 1H--1H nuclear Overhauser enhancement spectroscopy (1H-1H NOESY)' } },
            { extended_metadata: { kind: 'CHMO:0001173 | 13C--13C nuclear Overhauser enhancement spectroscopy (13C-13C NOESY)' } },
          ];
          containers.forEach((container) => {
            expect(isNMRKind(container, {chmosFixture})).toEqual(false);
          });
        });

        it('it is not NMR type when having list ontologies', () => {
          const containers = [
            { extended_metadata: { kind: 'mass spectrometry (MS)' } },
            { extended_metadata: { kind: 'high-performance liquid chromatography (HPLC)' } },
          ];
          containers.forEach((container) => {
            expect(isNMRKind(container, chmosFixture)).toEqual(false);
          });
        });
      });
    });
  });

  describe('.BuildSpcInfosForNMRDisplayer()', () => {
    describe('when sample or container is null or undefined', () => {
      it('sample is null or undefined', () => {
        const specInfo1 = BuildSpcInfosForNMRDisplayer(null, 'just a random value');
        expect(specInfo1).toEqual([]);

        const specInfo2 = BuildSpcInfosForNMRDisplayer(undefined, 'just a random value');
        expect(specInfo2).toEqual([]);
      });

      it('container is null or undefined', () => {
        const specInfo1 = BuildSpcInfosForNMRDisplayer('just a random value', null);
        expect(specInfo1).toEqual([]);

        const specInfo2 = BuildSpcInfosForNMRDisplayer('just a random value', undefined);
        expect(specInfo2).toEqual([]);
      });
    });

    describe('when it does not has any file to process', () => {
      it('container does not has any attachment', () => {
        const container = { children: [{ attachments: [] }] };
        const specInfo = BuildSpcInfosForNMRDisplayer('just a random value', container);
        expect(specInfo).toEqual([]);
      });

      it('container does not has any attachment as jcamp', () => {
        const container = { children: [{ attachments: [{ filename: 'testfile.txt' }] }] };
        const specInfo = BuildSpcInfosForNMRDisplayer('just a random value', container);
        expect(specInfo).toEqual([]);
      });

      it('container has a attachment as jcamp but aasm_state is in failed or processing state', () => {
        const states = ['idle', 'queueing', 'done', 'backup', 'image', 'non_jcamp'];
        states.forEach((state) => {
          const container = { children: [{ attachments: [{ filename: 'testfile.dx', aasm_state: state }] }] };
          const specInfo = BuildSpcInfosForNMRDisplayer('just a random value', container);
          expect(specInfo).toEqual([]);
        });
      });
    });

    describe('when it has file to be processed', () => {
      it('get spectra info', () => {
        const sample = Sample.buildEmpty();
        const analyses = Container.buildEmpty();
        analyses.container_type = 'analyses';

        const analysis = Container.buildEmpty();
        analysis.container_type = 'analysis';

        analyses.children.push(analysis);
        sample.container.children.push(analyses);

        const file1 = {
          dt: { id: '1001' }, id: '001', filename: 'testfile.dx', aasm_state: 'state'
        };
        const file2 = {
          dt: { id: '1001' }, id: '002', filename: 'testfile.nmrium', aasm_state: 'state'
        };
        const listFile = [file1, file2];
        const container = { id: analysis.id, children: [{ attachments: listFile }] };
        const specInfo = BuildSpcInfosForNMRDisplayer(sample, container);

        const expectedValue = listFile.map((file) => ({
          value: null,
          label: file.filename,
          title: sample.short_label,
          idSp: sample.id,
          idAe: analyses.id,
          idAi: container.id,
          idDt: file.idDt,
          idx: file.id,
        }));
        expect(specInfo).toEqual(expectedValue);
      });
    });
  });

  describe('.JcampIds()', () => {
    describe('when container does not have any child', () => {
      it('children is empty', () => {
        const container = Container.buildEmpty();
        const listJcampIds = JcampIds(container);
        const expectedValue = { orig: [], gene: [], edited: [] };
        expect(listJcampIds).toEqual(expectedValue);
      });
    });

    describe('when container does not have jcamp file', () => {
      const container = Container.buildEmpty();
      const attachments = [{ filename: 'testfile.txt' }];
      container.children.push({ attachments });

      const listJcampIds = JcampIds(container);
      const expectedValue = { orig: [], gene: [], edited: [] };
      expect(listJcampIds).toEqual(expectedValue);
    });

    describe('when container has jcamp files', () => {
      let container;

      beforeEach(() => {
        container = Container.buildEmpty();
      });

      it('Only has original files', () => {
        const attachments = [{ id: 1, filename: 'testfile.dx' }];
        container.children.push({ attachments });

        const listJcampIds = JcampIds(container);
        const expectedValue = { orig: [1], gene: [], edited: [] };
        expect(listJcampIds).toEqual(expectedValue);
      });

      it('Only has edidted and generated files', () => {
        const attachments = [{ id: 1, filename: 'testfile.peak.dx' }, { id: 2, filename: 'testfile.edit.dx' }];
        container.children.push({ attachments });

        const listJcampIds = JcampIds(container);
        const expectedValue = { orig: [], gene: [1, 2], edited: [1, 2] };
        expect(listJcampIds).toEqual(expectedValue);
      });

      it('Has original edidted and generated files', () => {
        const attachments = [
          { id: 1, filename: 'testfile.dx' },
          { id: 2, filename: 'testfile.peak.dx' },
          { id: 3, filename: 'testfile.edit.dx' }];
        container.children.push({ attachments });

        const listJcampIds = JcampIds(container);
        const expectedValue = { orig: [1], gene: [2, 3], edited: [2, 3] };
        expect(listJcampIds).toEqual(expectedValue);
      });

      it('treats bagit per-curve files as generated, not original', () => {
        // A bagit curve's own addon is "<n>_bagit" (see jcamp_peak_addon? on the Rails
        // side) - it never gains a .peak./.edit. addon, so it must not be classified
        // as "orig": regenerate_spectrum would then resubmit it independently in the
        // same request that's also reprocessing the archive that generated it, racing
        // the two and corrupting the result.
        const attachments = [
          { id: 1, filename: '740.zip' },
          { id: 2, filename: '740.1_bagit.jdx' },
          { id: 3, filename: '740.2_bagit.jdx' },
        ];
        container.children.push({ attachments });

        const listJcampIds = JcampIds(container);
        const expectedValue = { orig: [1], gene: [2, 3], edited: [] };
        expect(listJcampIds).toEqual(expectedValue);
      });
    });
  });

  describe('.BuildSpcInfos()', () => {
    describe('when sample or container is null or undefined', () => {
      it('sample is null or undefined', () => {
        const specInfo1 = BuildSpcInfos(null, 'just a random value');
        expect(specInfo1).toEqual([]);

        const specInfo2 = BuildSpcInfos(undefined, 'just a random value');
        expect(specInfo2).toEqual([]);
      });

      it('container is null or undefined', () => {
        const specInfo1 = BuildSpcInfos('just a random value', null);
        expect(specInfo1).toEqual([]);

        const specInfo2 = BuildSpcInfos('just a random value', undefined);
        expect(specInfo2).toEqual([]);
      });
    });

    describe('when it does not has any file to process', () => {
      it('container does not has any attachment', () => {
        const container = { children: [{ attachments: [] }] };
        const specInfo = BuildSpcInfos('just a random value', container);
        expect(specInfo).toEqual([]);
      });

      it('container does not has any attachment as jcamp', () => {
        const container = { children: [{ attachments: [{ filename: 'testfile.txt' }] }] };
        const specInfo = BuildSpcInfos('just a random value', container);
        expect(specInfo).toEqual([]);
      });

      it('container has a attachment as jcamp but aasm_state is in failed or processing state', () => {
        const states = ['idle', 'queueing', 'done', 'backup', 'image', 'failure', 'non_jcamp'];
        states.forEach((state) => {
          const container = { children: [{ attachments: [{ filename: 'testfile.dx', aasm_state: state }] }] };
          const specInfo = BuildSpcInfos('just a random value', container);
          expect(specInfo).toEqual([]);
        });
      });
    });

    describe('when it has file to be processed', () => {
      it('get spectra info', () => {
        const sample = Sample.buildEmpty();
        const analyses = Container.buildEmpty();
        analyses.container_type = 'analyses';

        const analysis = Container.buildEmpty();
        analysis.container_type = 'analysis';

        analyses.children.push(analysis);
        sample.container.children.push(analyses);

        const file = {
          dt: { id: '1001' }, id: '001', filename: 'testfile.dx', aasm_state: 'state'
        };
        const container = { id: analysis.id, children: [{ attachments: [file] }] };
        const specInfo = BuildSpcInfos(sample, container);

        const expectedValue = [
          {
            value: null,
            label: 'testfile.dx',
            title: sample.short_label,
            idSp: sample.id,
            idAe: analyses.id,
            idAi: container.id,
            idDt: file.idDt,
            idx: file.id,
          }
        ];
        expect(specInfo).toEqual(expectedValue);
      });
    });
  });

  describe('.cleaningNMRiumData()', () => {
    describe('when there is no nmrium data', () => {
      it('return null when nmrium data is null', () => {
        const cleanedNMRiumData = cleaningNMRiumData(null);
        expect(cleanedNMRiumData).toEqual(null);
      });

      it('return null when nmrium data is undefined', () => {
        const cleanedNMRiumData = cleaningNMRiumData(undefined);
        expect(cleanedNMRiumData).toEqual(null);
      });
    });

    describe('when it is nmrium but there is no data value', () => {
      it('return data when there is no data value', () => {
        const nmriumData = {};
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(nmriumData);
      });

      it('return data when it has data value but data is null or undefined', () => {
        let nmriumData = { data: null };
        let cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(nmriumData);

        nmriumData = { data: undefined };
        cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(nmriumData);
      });
    });

    describe('when it has data', () => {
      it('return data when there is no spectra value', () => {
        const nmriumData = { data: 'just a simple text' };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(nmriumData);
      });

      it('return data when spectra value is a empty array', () => {
        const nmriumData = { data: { spectra: [] } };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(nmriumData);
      });

      it('return data when spectra do not have originalData value', () => {
        const nmriumData = { data: { spectra: [ { x: [1.0, 2.0], y: [1.0, 2.0] } ] } };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(nmriumData);
      });

      it('remove originalData value', () => {
        const nmriumData = { data: { spectra: [ { x: [1.0, 2.0], y: [1.0, 2.0], originalData: { x: [1.5, 2.5], y: [1.5, 2.5] } } ] } };
        const expectedNmriumData = { data: { spectra: [ { x: [1.0, 2.0], y: [1.0, 2.0] } ] } };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(expectedNmriumData);
      });

      it('builds sources[]/selector.root and drops the data matrix for source-only 2D spectra, keeping info intact', () => {
        const nmriumData = {
          data: {
            spectra: [{
              source: { jcampURL: 'https://example.com/file.jdx' },
              info: {
                dimension: 2, name: 'cosy', isFid: true, nucleus: ['1H', '1H'],
              },
              originalInfo: { dimension: 2, name: 'cosy' },
              meta: { dimension: 2 },
              display: { name: 'cosy' },
              data: { re: { z: [[1.0, 2.0], [3.0, 4.0]] }, im: { z: [[1.0, 2.0], [3.0, 4.0]] } },
            }],
          },
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.data.spectra;
        expect(spectrum.info).toEqual({
          dimension: 2, name: 'cosy', isFid: true, nucleus: ['1H', '1H'],
        });
        expect(spectrum.originalInfo).toEqual(undefined);
        expect(spectrum.meta).toEqual({ dimension: 2 });
        expect(spectrum.display).toEqual({ name: 'cosy' });
        expect(spectrum.data).toEqual(undefined);
        expect(spectrum.selector).toEqual({ root: 'nmrium-src-cosy' });
        expect(cleanedNMRiumData.data.sources).toEqual([
          { id: 'nmrium-src-cosy', entries: [{ relativePath: '/file.jdx', baseURL: 'https://example.com' }] },
        ]);
      });

      it('keeps an unwrapped payload flat (no version, no data wrapper) when the source mechanism is used', () => {
        // A real NMRium capture of a source-backed spectrum has neither a version nor a {data:...}
        // wrapper -- just sources/spectra directly at the top level -- and reloads correctly. Forcing
        // either onto the payload here previously broke reload instead of fixing it.
        const nmriumData = {
          spectra: [{
            source: { jcampURL: 'https://example.com/file.jdx' },
            info: { dimension: 2, name: 'cosy', isFid: true },
            display: { name: 'cosy' },
            data: { rr: { z: [[1.0, 2.0], [3.0, 4.0]] } },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.version).toEqual(undefined);
        expect(cleanedNMRiumData.data).toEqual(undefined);
        const [spectrum] = cleanedNMRiumData.spectra;
        expect(spectrum.data).toEqual(undefined);
        expect(spectrum.selector).toEqual({ root: 'nmrium-src-cosy' });
        expect(cleanedNMRiumData.sources).toEqual([
          { id: 'nmrium-src-cosy', entries: [{ relativePath: '/file.jdx', baseURL: 'https://example.com' }] },
        ]);
      });

      it('does not wrap or add a version when the source mechanism is not used', () => {
        const nmriumData = { spectra: [{ x: [1.0, 2.0], y: [1.0, 2.0] }] };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData).toEqual(nmriumData);
      });

      it('keeps the data matrix when no resolvable source URL exists', () => {
        const nmriumData = {
          data: {
            spectra: [{
              sourceSelector: { files: [] },
              info: { dimension: 2, name: 'hsqc', isFid: false },
              display: { name: 'hsqc' },
              data: { rr: { z: [[1.0, 2.0], [3.0, 4.0]] } },
            }],
          },
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.data.spectra;
        expect(spectrum.data).toEqual({ rr: { z: [[1.0, 2.0], [3.0, 4.0]] } });
        expect(spectrum.selector).toEqual(undefined);
        expect(cleanedNMRiumData.data.sources).toEqual(undefined);
      });

      it('collapses same-named spectra sharing one zip into one sources[] entry, keeping per-spectrum disambiguation', () => {
        const nmriumData = {
          data: {
            source: { entries: [{ baseURL: 'https://example.com', relativePath: '/zip/file.zip' }] },
            spectra: [
              {
                sourceSelector: { files: ['exp1/pdata/1/2rr'] },
                info: { dimension: 2, name: 'multi', isFid: false },
                display: { name: 'multi' },
                data: { rr: { z: [[1.0]] } },
              },
              {
                sourceSelector: { files: ['exp2/pdata/1/2rr'] },
                info: { dimension: 2, name: 'multi', isFid: false },
                display: { name: 'multi' },
                data: { rr: { z: [[2.0]] } },
              },
            ],
          },
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [first, second] = cleanedNMRiumData.data.spectra;
        expect(first.selector).toEqual({ root: 'nmrium-src-multi', files: ['/zip/file.zip/exp1/pdata/1/2rr'] });
        expect(second.selector).toEqual({ root: 'nmrium-src-multi', files: ['/zip/file.zip/exp2/pdata/1/2rr'] });
        expect(first.data).toEqual(undefined);
        expect(second.data).toEqual(undefined);
      });

      it('backfills info.dimension/isFid from originalInfo/meta on legacy spectra where info is sparse', () => {
        const nmriumData = {
          data: {
            spectra: [{
              source: { jcampURL: 'https://example.com/file.jdx' },
              info: { name: 'cosy' },
              originalInfo: { dimension: 2, isFid: true, name: 'cosy' },
              meta: { dimension: 2 },
              display: { name: 'cosy' },
              data: { re: { z: [[1.0, 2.0], [3.0, 4.0]] }, im: { z: [[1.0, 2.0], [3.0, 4.0]] } },
            }],
          },
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.data.spectra;
        expect(spectrum.info).toEqual({
          dimension: 2, isFid: true, name: 'cosy',
        });
        expect(spectrum.originalInfo).toEqual(undefined);
        expect(spectrum.meta).toEqual({ dimension: 2 });
      });

      it('does not collapse same-named spectra that are backed by different files', () => {
        const nmriumData = {
          spectra: [
            {
              source: { jcampURL: 'https://example.com/a/file.jdx' },
              info: { dimension: 2, name: 'cosy' },
              display: { name: 'cosy' },
              data: { rr: { z: [[1.0]] } },
            },
            {
              source: { jcampURL: 'https://example.com/b/file.jdx' },
              info: { dimension: 2, name: 'cosy' },
              display: { name: 'cosy' },
              data: { rr: { z: [[2.0]] } },
            },
          ],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.sources).toEqual([
          { id: 'nmrium-src-cosy', entries: [{ relativePath: '/a/file.jdx', baseURL: 'https://example.com' }] },
          { id: 'nmrium-src-cosy-2', entries: [{ relativePath: '/b/file.jdx', baseURL: 'https://example.com' }] },
        ]);
        const [first, second] = cleanedNMRiumData.spectra;
        expect(first.selector).toEqual({ root: 'nmrium-src-cosy' });
        expect(second.selector).toEqual({ root: 'nmrium-src-cosy-2' });
      });

      // NMRium filters the fetched file collection by selector.files, and the entries of that collection
      // are the source's relativePath plus the member: a bare member path would match nothing.
      it('addresses the archive in sources[] and the member through it in selector.files', () => {
        const nmriumData = {
          spectra: [{
            sourceSelector: { files: ['https://example.com/tpa/token/file.zip/exp1/pdata/1/2rr'] },
            info: { dimension: 2, name: 'hsqc' },
            display: { name: 'hsqc' },
            data: { rr: { z: [[1.0]] } },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.sources).toEqual([
          { id: 'nmrium-src-hsqc', entries: [{ relativePath: '/tpa/token/file.zip', baseURL: 'https://example.com' }] },
        ]);
        expect(cleanedNMRiumData.spectra[0].selector).toEqual({
          root: 'nmrium-src-hsqc', files: ['/tpa/token/file.zip/exp1/pdata/1/2rr'],
        });
      });

      it('keeps only the member path in selector.files when the document is persisted', () => {
        const nmriumData = {
          spectra: [{
            sourceSelector: { files: ['https://example.com/tpa/token/file.zip/exp1/pdata/1/2rr'] },
            info: { dimension: 2, name: 'hsqc' },
            display: { name: 'hsqc' },
            data: { rr: { z: [[1.0]] } },
          }],
        };
        const attachments = [{ id: 11, label: 'hsqc.zip', url: 'https://example.com/tpa/token' }];
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData, { attachments, forPersistence: true });
        expect(cleanedNMRiumData.spectra[0].selector.files).toEqual(['exp1/pdata/1/2rr']);
      });

      it('re-roots an already server-path-patched zip reference on the registered archive too', () => {
        const nmriumData = {
          source: { entries: [{ baseURL: 'https://example.com', relativePath: '/tpa/token/file.zip' }] },
          spectra: [{
            sourceSelector: { files: ['/tpa/token/file.zip/exp1/pdata/1/2rr'] },
            info: { dimension: 2, name: 'hsqc' },
            display: { name: 'hsqc' },
            data: { rr: { z: [[1.0]] } },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.spectra[0].selector).toEqual({
          root: 'nmrium-src-hsqc', files: ['/tpa/token/file.zip/exp1/pdata/1/2rr'],
        });
      });

      it('prefers a freshly patched source over a sources[] entry persisted by an earlier save', () => {
        // Download URLs carry a short-lived token that is re-minted on every open, so the entry a
        // previous save left in sources[] is stale and must never win over the refreshed one.
        const nmriumData = {
          source: { entries: [{ baseURL: 'https://example.com', relativePath: '/tpa/fresh/file.zip' }] },
          sources: [{
            id: 'nmrium-src-hsqc',
            entries: [{ baseURL: 'https://example.com', relativePath: '/tpa/stale/file.zip' }],
          }],
          spectra: [{
            sourceSelector: { files: ['/tpa/fresh/file.zip/exp1/pdata/1/2rr'] },
            selector: { root: 'nmrium-src-hsqc' },
            info: { dimension: 2, name: 'hsqc' },
            display: { name: 'hsqc' },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.sources).toEqual([
          { id: 'nmrium-src-hsqc', entries: [{ relativePath: '/tpa/fresh/file.zip', baseURL: 'https://example.com' }] },
        ]);
      });

      // This used to keep entries it had not minted itself, on the theory that a foreign source
      // might still be wanted. readNMRiumObject says otherwise: it resolves a source only through
      // `g.get(spectrum.selector.root)`, so an unreferenced entry can never render anything - but
      // it is still fetched, along with every other, inside one `Promise.all`. One that no longer
      // resolves therefore rejects the read for the whole document and NMRium draws nothing at
      // all. An unreferenced entry is pure liability, whoever wrote it.
      it('drops every orphaned sources[] entry, including ones it did not mint', () => {
        const nmriumData = {
          sources: [
            { id: 'nmrium-src-old', entries: [{ baseURL: 'https://example.com', relativePath: '/gone' }] },
            { id: 'foreign', entries: [{ baseURL: 'https://example.com', relativePath: '/keep' }] },
          ],
          spectra: [{
            source: { jcampURL: 'https://example.com/a/file.jdx' },
            info: { dimension: 2, name: 'new' },
            display: { name: 'new' },
            data: { rr: { z: [[1.0]] } },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.sources.map((source) => source.id)).toEqual(['nmrium-src-new']);
      });

      it('keeps an orphaned entry that a molecule still addresses', () => {
        const nmriumData = {
          sources: [
            { id: 'mol-src', entries: [{ baseURL: 'https://example.com', relativePath: '/mol' }] },
          ],
          molecules: [{ selector: { root: 'mol-src' } }],
          spectra: [],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.sources.map((source) => source.id)).toEqual(['mol-src']);
      });

      describe('when cleaning for persistence', () => {
        const TPA = 'https://eln.test/api/v1/public/third_party_apps/A.OLD.TOKEN';
        const attachments = [{ id: 77, label: '740.zip', url: TPA }];
        const tokenEntry = () => ({
          baseURL: 'https://eln.test',
          relativePath: '/api/v1/public/third_party_apps/A.OLD.TOKEN/file.zip',
        });

        const zipState = () => ({
          spectra: [{
            info: { dimension: 2, name: '740.zip' },
            display: { name: '740.zip' },
            data: { rr: { z: [[1.0]] } },
            sourceSelector: { files: [`${TPA}/file.zip/exp1/pdata/1/2rr`] },
            selector: { root: 'wrapper-uuid' },
          }],
          sources: [{ id: 'wrapper-uuid', entries: [tokenEntry()] }],
        });

        it('persists an attachment reference instead of the download url', () => {
          const cleaned = cleaningNMRiumData(zipState(), { attachments, forPersistence: true });
          expect(cleaned.sources).toEqual([{
            id: 'nmrium-src-740-zip',
            entries: [{ baseURL: 'chemotion-attachment://eln', relativePath: '/77/740.zip' }],
          }]);
          expect(JSON.stringify(cleaned)).not.toContain('third_party_apps');
        });

        it('reduces sourceSelector.files to the member path, dropping the token', () => {
          const cleaned = cleaningNMRiumData(zipState(), { attachments, forPersistence: true });
          expect(cleaned.spectra[0].sourceSelector.files).toEqual(['exp1/pdata/1/2rr']);
        });

        // A zip loaded by url leaves no sourceSelector at all: NMRium writes the member list into
        // selector.files itself, each entry the download url's path through the archive.
        it("reduces NMRium's own selector.files to member paths, dropping the token", () => {
          const loadedByUrl = zipState();
          delete loadedByUrl.spectra[0].sourceSelector;
          loadedByUrl.spectra[0].selector.files = [
            '/api/v1/public/third_party_apps/A.OLD.TOKEN/file.zip/exp1/pdata/1/2rr',
            '/api/v1/public/third_party_apps/A.OLD.TOKEN/file.zip/exp1/acqus',
          ];
          const cleaned = cleaningNMRiumData(loadedByUrl, { attachments, forPersistence: true });
          expect(cleaned.spectra[0].selector).toEqual({
            root: 'nmrium-src-740-zip',
            files: ['exp1/pdata/1/2rr', 'exp1/acqus'],
          });
          expect(JSON.stringify(cleaned)).not.toContain('third_party_apps');
        });

        it('keeps the data matrix when no attachment backs the spectrum', () => {
          const cleaned = cleaningNMRiumData(zipState(), { attachments: [], forPersistence: true });
          expect(cleaned.spectra[0].data).toEqual({ rr: { z: [[1.0]] } });
          expect(cleaned.sources).toEqual(undefined);
        });

        // NMRium's no-source fallback (readNMRiumObject -> bn) destructures info.dimension
        // unguarded, so dropping info on a spectrum that has to fall back there would throw.
        it('keeps an info for a spectrum it could not register a source for', () => {
          const bare = {
            spectra: [{
              display: { name: 'cosy', dimension: 2 },
              data: { rr: { z: [[1.0]] } },
              selector: { root: 'wrapper-uuid' },
            }],
            sources: [{ id: 'wrapper-uuid', entries: [tokenEntry()] }],
          };
          const cleaned = cleaningNMRiumData(bare, { attachments: [], forPersistence: true });
          expect(cleaned.spectra[0].info).toEqual({ dimension: 2 });
          expect(cleaned.spectra[0].data).toEqual({ rr: { z: [[1.0]] } });
        });

        // The shape NMRium itself writes for a 1D JCAMP it loaded by url: its source entry carries
        // the whole download url in relativePath with no baseURL, and selector.files repeats it.
        // Saved as is, the token was the spectrum's only source and it reopened empty.
        describe("with NMRium's own url-only source for a 1D JCAMP", () => {
          const JDX = `${TPA}/file.jdx`;
          const oneD = () => ({
            spectra: [{
              id: 'spc-1d',
              info: { dimension: 1, name: 'a.peak.jdx' },
              data: { x: [1, 2], re: [3, 4] },
              selector: { root: 'nmrium-uuid', files: [JDX] },
            }],
            sources: [{ id: 'nmrium-uuid', entries: [{ relativePath: JDX }] }],
          });

          it('drops the source and keeps the embedded data', () => {
            const cleaned = cleaningNMRiumData(oneD(), { attachments, forPersistence: true });
            expect(cleaned.sources).toEqual(undefined);
            expect(cleaned.spectra[0].selector).toEqual({});
            expect(cleaned.spectra[0].data).toEqual({ x: [1, 2], re: [3, 4] });
            expect(JSON.stringify(cleaned)).not.toContain('third_party_apps');
          });

          it('also strips the url from selector.files when there is no source to cut loose from', () => {
            const noSources = oneD();
            delete noSources.sources;
            delete noSources.spectra[0].selector.root;
            const cleaned = cleaningNMRiumData(noSources, { attachments, forPersistence: true });
            expect(cleaned.spectra[0].selector.files).toEqual(undefined);
            expect(JSON.stringify(cleaned)).not.toContain('third_party_apps');
          });

          it('leaves the url-only source in place for display', () => {
            const cleaned = cleaningNMRiumData(oneD(), { attachments });
            expect(cleaned.sources).toEqual([{ id: 'nmrium-uuid', entries: [{ relativePath: JDX }] }]);
            expect(cleaned.spectra[0].selector).toEqual({ root: 'nmrium-uuid', files: [JDX] });
          });
        });

        it('cuts loose a spectrum whose only source could not be made durable', () => {
          const cleaned = cleaningNMRiumData(zipState(), { attachments: [], forPersistence: true });
          expect(cleaned.sources).toEqual(undefined);
          expect(cleaned.spectra[0].selector.root).toEqual(undefined);
        });

        // Cutting loose is the one place cleaning reaches *into* a spectrum it copied: a copy
        // still shares its `selector` object with the original, and `molecules` is not copied at
        // all. Deleting the root in place would reach back into the live NMRium state being saved.
        it('cuts a spectrum loose without touching the payload it was given', () => {
          const live = zipState();
          live.molecules = [{ selector: { root: 'wrapper-uuid' } }];
          const snapshot = JSON.stringify(live);
          cleaningNMRiumData(live, { attachments: [], forPersistence: true });
          expect(JSON.stringify(live)).toEqual(snapshot);
        });

        // source.jcampURL is the first thing resolveSpectrumSourceUrl consults, so persisting the
        // token there both writes a download url into the file and shadows the durable entry: the
        // next open would re-mint sources[] only to have cleaning overwrite it with this dead url.
        it('rewrites source.jcampURL to a reference instead of persisting the token', () => {
          const jcampState = {
            spectra: [{
              info: { dimension: 2, name: 'cosy.jdx' },
              display: { name: 'cosy.jdx' },
              data: { rr: { z: [[1.0]] } },
              source: { jcampURL: `${TPA}/file.jdx` },
              sourceSelector: { files: [`${TPA}/file.jdx`] },
              selector: { root: 'wrapper-uuid' },
            }],
            sources: [{ id: 'wrapper-uuid', entries: [tokenEntry()] }],
          };
          const jcamp = [{ id: 5, label: 'cosy.jdx', url: TPA }];
          const cleaned = cleaningNMRiumData(jcampState, { attachments: jcamp, forPersistence: true });
          expect(cleaned.spectra[0].source.jcampURL).toEqual('chemotion-attachment://eln/5/cosy.jdx');
          expect(JSON.stringify(cleaned)).not.toContain('third_party_apps');
        });

        // The sanitising used to sit under `if (sourceId)`, so a spectrum nothing could be
        // registered for kept every token url it arrived with.
        it('strips the token from a spectrum it could not register a source for', () => {
          const jcampState = {
            spectra: [{
              info: { dimension: 2, name: 'cosy.jdx' },
              display: { name: 'cosy.jdx' },
              data: { rr: { z: [[1.0]] } },
              source: { jcampURL: `${TPA}/file.jdx` },
              sourceSelector: { files: [`${TPA}/file.jdx`] },
              selector: { root: 'wrapper-uuid' },
            }],
            sources: [{ id: 'wrapper-uuid', entries: [tokenEntry()] }],
          };
          const cleaned = cleaningNMRiumData(jcampState, { attachments: [], forPersistence: true });
          expect(JSON.stringify(cleaned)).not.toContain('third_party_apps');
          expect(cleaned.spectra[0].data).toEqual({ rr: { z: [[1.0]] } });
        });

        it('drops a legacy singular source that would shadow the durable reference', () => {
          const withGlobal = zipState();
          withGlobal.source = { entries: [tokenEntry()] };
          const cleaned = cleaningNMRiumData(withGlobal, { attachments: [], forPersistence: true });
          expect(cleaned.source).toEqual(undefined);
        });

        // A collection export writes `as_json.except('id')` and the importer builds fresh rows,
        // so the id inside a persisted reference is meaningless once a document has moved between
        // instances - and worse, ids are reassigned from the destination's own sequence, so a
        // stale one can land on a sibling attachment. The filename is the only field the transfer
        // carries across intact, so it has to win.
        it('resolves a re-persisted reference by filename, not by a stale id', () => {
          const stale = {
            spectra: [{
              info: { dimension: 2, name: '740.zip' },
              display: { name: '740.zip' },
              data: { rr: { z: [[1.0]] } },
              selector: { root: 'nmrium-src-740-zip' },
            }],
            sources: [{
              id: 'nmrium-src-740-zip',
              entries: [{ baseURL: 'chemotion-attachment://eln', relativePath: '/4711/740.zip' }],
            }],
          };
          const imported = [
            { id: 9002, label: '740.zip', url: 'https://eln.test/api/v1/public/third_party_apps/B1' },
            { id: 4711, label: '740.1_bagit.jdx', url: 'https://eln.test/api/v1/public/third_party_apps/B2' },
          ];
          const cleaned = cleaningNMRiumData(stale, { attachments: imported, forPersistence: true });
          expect(cleaned.sources[0].entries[0].relativePath).toEqual('/9002/740.zip');
        });

        // The reference carries the filename verbatim, but resolution used to compare only its
        // slug, which collapses every run of non-alphanumerics to a single dash: `a-b.zip` and
        // `a_b.zip` are indistinguishable to it. Two such siblings in one dataset and a stale id -
        // which after an import is every id - had `named.find(id)` land on the *other* file.
        it('prefers an exact filename over a slug-equal sibling with the stale id', () => {
          const stale = {
            spectra: [{
              info: { dimension: 2, name: 'a-b.zip' },
              display: { name: 'a-b.zip' },
              data: { rr: { z: [[1.0]] } },
              selector: { root: 'nmrium-src-a-b-zip' },
            }],
            sources: [{
              id: 'nmrium-src-a-b-zip',
              entries: [{ baseURL: 'chemotion-attachment://eln', relativePath: '/4711/a-b.zip' }],
            }],
          };
          const imported = [
            { id: 4711, label: 'a_b.zip', url: 'https://eln.test/api/v1/public/third_party_apps/B1' },
            { id: 9002, label: 'a-b.zip', url: 'https://eln.test/api/v1/public/third_party_apps/B2' },
          ];
          const cleaned = cleaningNMRiumData(stale, { attachments: imported, forPersistence: true });
          expect(cleaned.sources[0].entries[0].relativePath).toEqual('/9002/a-b.zip');
        });

        // The slug tier still has to carry a file renamed only in its punctuation - nothing bears
        // the exact name any more, so the lossy comparison is the only thing left that can match.
        it('falls back to the slug when nothing carries the exact filename', () => {
          const renamed = {
            spectra: [{
              info: { dimension: 2, name: 'a-b.zip' },
              display: { name: 'a-b.zip' },
              data: { rr: { z: [[1.0]] } },
              selector: { root: 'nmrium-src-a-b-zip' },
            }],
            sources: [{
              id: 'nmrium-src-a-b-zip',
              entries: [{ baseURL: 'chemotion-attachment://eln', relativePath: '/4711/a-b.zip' }],
            }],
          };
          const imported = [
            { id: 9002, label: 'a_b.zip', url: 'https://eln.test/api/v1/public/third_party_apps/B2' },
          ];
          const cleaned = cleaningNMRiumData(renamed, { attachments: imported, forPersistence: true });
          expect(cleaned.sources[0].entries[0].relativePath).toEqual('/9002/a_b.zip');
        });

        it('still embeds live urls when not persisting', () => {
          const cleaned = cleaningNMRiumData(zipState(), { attachments });
          expect(cleaned.sources[0].entries[0].baseURL).toEqual('https://eln.test');
        });
      });

      it('leaves the payload it was given untouched', () => {
        const nmriumData = {
          data: {
            actionType: 'SOME_ACTION',
            spectra: [{
              source: { jcampURL: 'https://example.com/file.jdx' },
              info: { dimension: 2, name: 'cosy' },
              display: { name: 'cosy' },
              originalData: { rr: { z: [[9.0]] } },
              data: { rr: { z: [[1.0]] } },
            }],
          },
        };
        const snapshot = JSON.stringify(nmriumData);
        cleaningNMRiumData(nmriumData);
        expect(JSON.stringify(nmriumData)).toEqual(snapshot);
      });

      it('keeps the data matrix instead of throwing on an unparsable source url', () => {
        const nmriumData = {
          spectra: [{
            source: { jcampURL: 'https://' },
            info: { dimension: 2, name: 'cosy' },
            display: { name: 'cosy' },
            data: { rr: { z: [[1.0]] } },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        expect(cleanedNMRiumData.spectra[0].data).toEqual({ rr: { z: [[1.0]] } });
        expect(cleanedNMRiumData.spectra[0].selector).toEqual(undefined);
      });

      it('keeps data for 1D spectra that have a source (NMRium never re-fetches it)', () => {
        const nmriumData = {
          data: {
            spectra: [{
              source: { jcampURL: 'https://example.com/file.jdx' },
              info: { dimension: 1, name: 'proton' },
              display: { name: 'proton' },
              data: { x: [1.0, 2.0], y: [1.0, 2.0] },
            }],
          },
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.data.spectra;
        expect(spectrum.data).toEqual({ x: [1.0, 2.0], y: [1.0, 2.0] });
        expect(spectrum.info).toEqual({ dimension: 1, name: 'proton' });
      });

      it('still recognises a 2D spectrum whose info/originalInfo/meta an earlier cleaner deleted', () => {
        // Shape of a real .nmrium written by a cleaner that dropped info/originalInfo/meta from a
        // source-backed 2D spectrum. display.dimension is the only surviving record that it is 2D;
        // without honouring it the migration is skipped and the stale sources[] URL and the dead
        // full-server-path selector.files below are both left in place, with no data to fall back on.
        const nmriumData = {
          source: { entries: [{ baseURL: 'https://example.com', relativePath: '/tpa/fresh/file.zip' }] },
          sources: [{
            id: 'nmrium-src-hsqc-zip',
            entries: [{ baseURL: 'https://example.com', relativePath: '/tpa/expired/file.zip' }],
          }],
          spectra: [{
            display: { name: 'hsqc.zip', dimension: 2 },
            selector: { root: 'nmrium-src-hsqc-zip', files: ['/tpa/expired/file.zip/exp1/pdata/1/2rr'] },
            sourceSelector: { files: ['/tpa/fresh/file.zip/exp1/pdata/1/2rr', '/tpa/fresh/file.zip/exp1/acqus'] },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.spectra;
        expect(cleanedNMRiumData.sources).toEqual([
          { id: 'nmrium-src-hsqc-zip', entries: [{ relativePath: '/tpa/fresh/file.zip', baseURL: 'https://example.com' }] },
        ]);
        expect(spectrum.selector).toEqual({
          root: 'nmrium-src-hsqc-zip',
          files: ['/tpa/fresh/file.zip/exp1/pdata/1/2rr', '/tpa/fresh/file.zip/exp1/acqus'],
        });
      });

      it('leaves info absent rather than empty when there is nothing to backfill it from', () => {
        const nmriumData = {
          spectra: [{
            source: { jcampURL: 'https://example.com/file.jdx' },
            display: { name: 'hsqc.jdx', dimension: 2 },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.spectra;
        expect(spectrum.selector).toEqual({ root: 'nmrium-src-hsqc-jdx' });
        expect('info' in spectrum).toEqual(false);
      });

      it('names a 2D spectrum from meta.TITLE when display.name is only its own uuid', () => {
        // Real shape of a spectrum NMRium loaded straight from a jcamp: display.name defaults to
        // the spectrum id, info carries no name, and the source file's stem survives only in the
        // raw JCAMP TITLE - as an array of repeats.
        const nmriumData = {
          spectra: [{
            id: '985335b4-3535-4098-b92c-fe4b20692cd1',
            display: { name: '985335b4-3535-4098-b92c-fe4b20692cd1', dimension: 2 },
            info: { dimension: 2, isFid: false },
            meta: { TITLE: ['X23827_10.processed_1', 'X23827_10.processed_1'] },
            source: { jcampURL: 'https://example.com/file.jdx' },
            data: { rr: { z: [[1.0]] } },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.spectra;
        expect(spectrum.display.name).toEqual('X23827_10.processed_1');
        expect(cleanedNMRiumData.sources).toEqual([
          { id: 'nmrium-src-x23827-10-processed-1', entries: [{ relativePath: '/file.jdx', baseURL: 'https://example.com' }] },
        ]);
        expect(spectrum.selector).toEqual({ root: 'nmrium-src-x23827-10-processed-1' });
      });

      it('does not drop the data matrix of a display-only 2D spectrum that has no source', () => {
        const nmriumData = {
          spectra: [{
            display: { name: 'hsqc', dimension: 2 },
            data: { rr: { z: [[1.0]] } },
          }],
        };
        const cleanedNMRiumData = cleaningNMRiumData(nmriumData);
        const [spectrum] = cleanedNMRiumData.spectra;
        expect(spectrum.data).toEqual({ rr: { z: [[1.0]] } });
        expect(spectrum.selector).toEqual(undefined);
      });
    });
  });

  describe('.spectrumName()', () => {
    it('prefers a real display.name', () => {
      expect(spectrumName({ id: 'abc', display: { name: 'cosy.jdx' } })).toEqual('cosy.jdx');
    });

    it('ignores a display.name that is only the spectrum id', () => {
      const uuid = '985335b4-3535-4098-b92c-fe4b20692cd1';
      expect(spectrumName({ id: uuid, display: { name: uuid }, info: { name: 'cosy.jdx' } })).toEqual('cosy.jdx');
    });

    it('falls back to meta.TITLE, taking the first usable entry of an array', () => {
      const uuid = '985335b4-3535-4098-b92c-fe4b20692cd1';
      expect(spectrumName({
        id: uuid,
        display: { name: uuid },
        meta: { TITLE: ['  ', 'X23827_10.processed_1'] },
      })).toEqual('X23827_10.processed_1');
    });

    it('accepts a plain string meta.TITLE', () => {
      expect(spectrumName({ meta: { TITLE: 'hsqc' } })).toEqual('hsqc');
    });

    it('returns null when nothing names the spectrum', () => {
      const uuid = '985335b4-3535-4098-b92c-fe4b20692cd1';
      expect(spectrumName({ id: uuid, display: { name: uuid }, meta: { TITLE: [] } })).toEqual(null);
      expect(spectrumName(undefined)).toEqual(null);
    });
  });

  describe('.inlineNotation()', () => {
    describe('Inline notation for Cyclic voltammetry layout', () => {
      const allLayouts = FN.LIST_LAYOUT;
      it('return empty string if it is not CV layout', () => {
        const layouts = Object.assign({}, allLayouts);
        delete layouts.CYCLIC_VOLTAMMETRY;
        Object.keys(layouts).forEach((layout) => {
          const formattedData = inlineNotation(allLayouts[layout], '', { cvConc: '10 mM', cvSolvent: 'MeCN', cvRef: null });
          const { formattedString, quillData } = formattedData;
          expect(formattedString).toEqual('');
          expect(quillData).toEqual([]);
        })
      });

      it('Inline notation for Cyclic voltammetry layout without concentration', () => {
        const expectedString = "CV (<conc. of sample> in <solvent> vs. Ref (Fc+/Fc) = -0.72 V, v = 0.10 V/s, to neg.):\nE1/2 = ([Cu(TMGqu)] , ΔEp) = -0.73 V (1650 mV)"
        const expectedQuillData = [{insert:"CV (<conc. of sample> in <solvent> vs. Ref "},{insert:"(Fc"},{insert:"+",attributes:{script:'super'}},{insert:"/Fc) "},{insert:"= -0.72 V, v = 0.10 V/s, to neg.):"},{insert:"\nE"},{insert:"1/2",attributes:{script:'sub'}},{insert:" = ([Cu(TMGqu)] , ΔE"},{insert:"p",attributes:{script:'sub'}},{insert:") = -0.73 V (1650 mV)"},]
        const layout = allLayouts.CYCLIC_VOLTAMMETRY
        const data = {
          scanRate: 0.1,
          voltaData: {
            listPeaks: [{"min":{"x":-1.5404,"y":-0.00000307144},"max":{"x":0.10003,"y":0.00000285434},"isRef":true,"e12":-0.720185,"createdAt":1716803991732,"updatedAt":1716803991733,"pecker":{"x":0.380242,"y":0.00000164361}},{"max":{"x":0.10002,"y":0.00000283434},"e12":-0.72519,"updatedAt":1716803991733,"min":{"x":-1.5504,"y":-0.00000317144},"pecker":{"x":0.480242,"y":0.00000174361},"isRef":false}],
            xyData: {x:[1.49048,1.48049],y:[0.00000534724,0.00000481545],},
          },
          sampleName: 'Cu(TMGqu)',
        };
        const formattedData = inlineNotation(layout, data, { cvConc: null, cvSolvent: null, cvRef: null });
        const { formattedString, quillData } = formattedData;
        expect(formattedString).toEqual(expectedString);
        expect(quillData).toEqual(expectedQuillData);
      });

      it('Inline notation for Cyclic voltammetry layout with concentration', () => {
        const expectedString = "CV (10 mM in <solvent> vs. Ref (Fc+/Fc) = -0.72 V, v = 0.10 V/s, to neg.):\nE1/2 = ([Cu(TMGqu)] , ΔEp) = -0.73 V (1650 mV)"
        const expectedQuillData = [{insert:"CV (10 mM in <solvent> vs. Ref "},{insert:"(Fc"},{insert:"+",attributes:{script:'super'}},{insert:"/Fc) "},{insert:"= -0.72 V, v = 0.10 V/s, to neg.):"},{insert:"\nE"},{insert:"1/2",attributes:{script:'sub'}},{insert:" = ([Cu(TMGqu)] , ΔE"},{insert:"p",attributes:{script:'sub'}},{insert:") = -0.73 V (1650 mV)"},]
        const layout = allLayouts.CYCLIC_VOLTAMMETRY
        const data = {
          scanRate: 0.1,
          voltaData: {
            listPeaks: [{"min":{"x":-1.5404,"y":-0.00000307144},"max":{"x":0.10003,"y":0.00000285434},"isRef":true,"e12":-0.720185,"createdAt":1716803991732,"updatedAt":1716803991733,"pecker":{"x":0.380242,"y":0.00000164361}},{"max":{"x":0.10002,"y":0.00000283434},"e12":-0.72519,"updatedAt":1716803991733,"min":{"x":-1.5504,"y":-0.00000317144},"pecker":{"x":0.480242,"y":0.00000174361},"isRef":false}],
            xyData: {x:[1.49048,1.48049],y:[0.00000534724,0.00000481545],},
          },
          sampleName: 'Cu(TMGqu)',
          concentration: 10,
        };
        const formattedData = inlineNotation(layout, data, { cvConc: '10 mM', cvSolvent: null, cvRef: null });
        const { formattedString, quillData } = formattedData;
        expect(formattedString).toEqual(expectedString);
        expect(quillData).toEqual(expectedQuillData);
      });

      it('Inline notation for Cyclic voltammetry layout with solvent', () => {
        const expectedString = "CV (10 mM in MeCN vs. Ref (Fc+/Fc) = -0.72 V, v = 0.10 V/s, to neg.):\nE1/2 = ([Cu(TMGqu)] , ΔEp) = -0.73 V (1650 mV)"
        const expectedQuillData = [{insert:"CV (10 mM in MeCN vs. Ref "},{insert:"(Fc"},{insert:"+",attributes:{script:'super'}},{insert:"/Fc) "},{insert:"= -0.72 V, v = 0.10 V/s, to neg.):"},{insert:"\nE"},{insert:"1/2",attributes:{script:'sub'}},{insert:" = ([Cu(TMGqu)] , ΔE"},{insert:"p",attributes:{script:'sub'}},{insert:") = -0.73 V (1650 mV)"},]
        const layout = allLayouts.CYCLIC_VOLTAMMETRY
        const data = {
          scanRate: 0.1,
          voltaData: {
            listPeaks: [{"min":{"x":-1.5404,"y":-0.00000307144},"max":{"x":0.10003,"y":0.00000285434},"isRef":true,"e12":-0.720185,"createdAt":1716803991732,"updatedAt":1716803991733,"pecker":{"x":0.380242,"y":0.00000164361}},{"max":{"x":0.10002,"y":0.00000283434},"e12":-0.72519,"updatedAt":1716803991733,"min":{"x":-1.5504,"y":-0.00000317144},"pecker":{"x":0.480242,"y":0.00000174361},"isRef":false}],
            xyData: {x:[1.49048,1.48049],y:[0.00000534724,0.00000481545],},
          },
          sampleName: 'Cu(TMGqu)',
          concentration: 10,
          solvent: 'MeCN',
        };
        const formattedData = inlineNotation(layout, data, { cvConc: '10 mM', cvSolvent: 'MeCN', cvRef: null });
        const { formattedString, quillData } = formattedData;
        expect(formattedString).toEqual(expectedString);
        expect(quillData).toEqual(expectedQuillData);
      });

      it('Inline notation for Cyclic voltammetry layout with internal reference', () => {
        const internalRefValues = {
          'ferrocene': {
            formatedStr: '(Fc+/Fc)',
            deltaVal: [{insert:"(Fc"},{insert:"+",attributes:{script:'super'}},{insert:"/Fc) "}]
          },
          'decamethylferrocene': {
            formatedStr: '(Me10Fc+/Me10Fc)',
            deltaVal: [
              {insert:"(Me"},
              {insert:"10",attributes:{script:'sub'}},
              {insert:"Fc"},
              {insert:"+",attributes:{script:'super'}},
              {insert:"/Me"},
              {insert:"10",attributes:{script:'sub'}},
              {insert:"Fc) "},
            ]
          }
        };
        const layout = allLayouts.CYCLIC_VOLTAMMETRY
        const data = {
          scanRate: 0.1,
          voltaData: {
            listPeaks: [{"min":{"x":-1.5404,"y":-0.00000307144},"max":{"x":0.10003,"y":0.00000285434},"isRef":true,"e12":-0.720185,"createdAt":1716803991732,"updatedAt":1716803991733,"pecker":{"x":0.380242,"y":0.00000164361}},{"max":{"x":0.10002,"y":0.00000283434},"e12":-0.72519,"updatedAt":1716803991733,"min":{"x":-1.5504,"y":-0.00000317144},"pecker":{"x":0.480242,"y":0.00000174361},"isRef":false}],
            xyData: {x:[1.49048,1.48049],y:[0.00000534724,0.00000481545],},
          },
          sampleName: 'Cu(TMGqu)',
          concentration: 10,
          solvent: 'MeCN',
        };

        for (const [refKey, refValue] of Object.entries(internalRefValues)) {
          const { formatedStr, deltaVal } = refValue;
          data['internalRef'] = refKey;

          const expectedString = `CV (10 mM in MeCN vs. Ref ${formatedStr} = -0.72 V, v = 0.10 V/s, to neg.):\nE1/2 = ([Cu(TMGqu)] , ΔEp) = -0.73 V (1650 mV)`
          const expectedQuillData = [{insert:"CV (10 mM in MeCN vs. Ref "},...deltaVal,{insert:"= -0.72 V, v = 0.10 V/s, to neg.):"},{insert:"\nE"},{insert:"1/2",attributes:{script:'sub'}},{insert:" = ([Cu(TMGqu)] , ΔE"},{insert:"p",attributes:{script:'sub'}},{insert:") = -0.73 V (1650 mV)"},]
          const formattedData = inlineNotation(layout, data, { cvConc: '10 mM', cvSolvent: 'MeCN', cvRef: refKey });
          const { formattedString, quillData } = formattedData;
          expect(formattedString).toEqual(expectedString);
          expect(quillData).toEqual(expectedQuillData);
        }
      });

      it('Inline notation for Cyclic voltammetry layout custom scan rate', () => {
        const expectedString = "CV (<conc. of sample> in <solvent> vs. Ref (Fc+/Fc) = -0.72 V, v = 0.51 V/s, to neg.):\nE1/2 = ([Cu(TMGqu)] , ΔEp) = -0.73 V (1650 mV)"
        const expectedQuillData = [{insert:"CV (<conc. of sample> in <solvent> vs. Ref "},{insert:"(Fc"},{insert:"+",attributes:{script:'super'}},{insert:"/Fc) "},{insert:"= -0.72 V, v = 0.51 V/s, to neg.):"},{insert:"\nE"},{insert:"1/2",attributes:{script:'sub'}},{insert:" = ([Cu(TMGqu)] , ΔE"},{insert:"p",attributes:{script:'sub'}},{insert:") = -0.73 V (1650 mV)"},]
        const layout = allLayouts.CYCLIC_VOLTAMMETRY
        const data = {
          scanRate: 0.1,
          voltaData: {
            listPeaks: [{"min":{"x":-1.5404,"y":-0.00000307144},"max":{"x":0.10003,"y":0.00000285434},"isRef":true,"e12":-0.720185,"createdAt":1716803991732,"updatedAt":1716803991733,"pecker":{"x":0.380242,"y":0.00000164361}},{"max":{"x":0.10002,"y":0.00000283434},"e12":-0.72519,"updatedAt":1716803991733,"min":{"x":-1.5504,"y":-0.00000317144},"pecker":{"x":0.480242,"y":0.00000174361},"isRef":false}],
            xyData: {x:[1.49048,1.48049],y:[0.00000534724,0.00000481545],},
          },
          sampleName: 'Cu(TMGqu)',
        };
        const formattedData = inlineNotation(layout, data, { cvConc: null, cvSolvent: null, cvRef: null, cvScanRate: 0.51 });
        const { formattedString, quillData } = formattedData;
        expect(formattedString).toEqual(expectedString);
        expect(quillData).toEqual(expectedQuillData);
      });
    });
  });
});
