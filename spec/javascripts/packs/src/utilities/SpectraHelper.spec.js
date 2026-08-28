import expect from 'expect';
import { FN } from '@complat/react-spectra-editor';
import {
  isNMRKind, BuildSpcInfosForNMRDisplayer,
  JcampIds, BuildSpcInfos, cleaningNMRiumData,
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
        expect(first.selector).toEqual({ root: 'nmrium-src-multi', files: ['exp1/pdata/1/2rr'] });
        expect(second.selector).toEqual({ root: 'nmrium-src-multi', files: ['exp2/pdata/1/2rr'] });
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

      it('addresses the archive in sources[] and the member path in selector.files', () => {
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
          root: 'nmrium-src-hsqc', files: ['exp1/pdata/1/2rr'],
        });
      });

      it('reduces an already server-path-patched zip reference to the member path too', () => {
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
          root: 'nmrium-src-hsqc', files: ['exp1/pdata/1/2rr'],
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

      it('drops its own orphaned sources[] entries but leaves foreign ones alone', () => {
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
        expect(cleanedNMRiumData.sources.map((source) => source.id).sort()).toEqual(['foreign', 'nmrium-src-new']);
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
          files: ['exp1/pdata/1/2rr', 'exp1/acqus'],
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
