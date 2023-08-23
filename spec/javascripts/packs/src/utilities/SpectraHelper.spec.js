import expect from 'expect';
import {
  describe, it, beforeEach
} from 'mocha';
import {
  isNMRKind, BuildSpcInfosForNMRDisplayer,
  JcampIds, BuildSpcInfos,
  BuildSpectraComparedInfos
} from 'src/utilities/SpectraHelper';
import Sample from 'src/models/Sample';
import Container from 'src/models/Container';

describe('SpectraHelper', () => {
  describe('isNMRKind', () => {
    describe('container is null or undefined', () => {
      it('container is null', () => {
        expect(isNMRKind(null)).toEqual(false);
      });

      it('container is undefined', () => {
        expect(isNMRKind(undefined)).toEqual(false);
      });
    });

    describe('container is neither not null nor undefined', () => {
      it('container does not has extended_metadata', () => {
        const container = 'Just a random value';
        expect(isNMRKind(container)).toEqual(false);
      });

      describe('container has extended_metadata', () => {
        it('metadata does not has kind value', () => {
          const container = { extended_metadata: {} };
          expect(isNMRKind(container)).toEqual(false);
        });

        it('metadata has kind value but it is not NMR type', () => {
          const container = { extended_metadata: { kind: 'Mass spectrum' } };
          expect(isNMRKind(container)).toEqual(false);
        });

        it('it is NMR type', () => {
          const container = { extended_metadata: { kind: '1H nuclear magnetic resonance spectroscopy (1H NMR)' } };
          expect(isNMRKind(container)).toEqual(true);
        });
      });
    });
  });

  describe('BuildSpcInfosForNMRDisplayer', () => {
    describe('sample or container is null or undefined', () => {
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

    describe('it does not has any file to process', () => {
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

    describe('it has file to be processed', () => {
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

  describe('JcampIds', () => {
    describe('Container does not have any child', () => {
      it('children is empty', () => {
        const container = Container.buildEmpty();
        const listJcampIds = JcampIds(container);
        const expectedValue = { orig: [], gene: [], edited: [] };
        expect(listJcampIds).toEqual(expectedValue);
      });
    });

    describe('Container does not have jcamp file', () => {
      const container = Container.buildEmpty();
      const attachments = [{ filename: 'testfile.txt' }];
      container.children.push({ attachments });

      const listJcampIds = JcampIds(container);
      const expectedValue = { orig: [], gene: [], edited: [] };
      expect(listJcampIds).toEqual(expectedValue);
    });

    describe('Container has jcamp files', () => {
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

  describe('BuildSpcInfos', () => {
    describe('sample or container is null or undefined', () => {
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

    describe('it does not has any file to process', () => {
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

    describe('it has file to be processed', () => {
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

  describe('.BuildSpectraComparedInfos()', () => {
    describe('when sample or container is null or undefined', () => {
      it('sample is null or undefined', () => {
        const specInfo1 = BuildSpectraComparedInfos(null, 'just a random value');
        expect(specInfo1).toEqual([]);

        const specInfo2 = BuildSpectraComparedInfos(undefined, 'just a random value');
        expect(specInfo2).toEqual([]);
      });

      it('container is null or undefined', () => {
        const specInfo1 = BuildSpectraComparedInfos('just a random value', null);
        expect(specInfo1).toEqual([]);

        const specInfo2 = BuildSpectraComparedInfos('just a random value', undefined);
        expect(specInfo2).toEqual([]);
      });
    });

    describe('when it does not has any comparable info', () => {
      let container;
      beforeEach(() => {
        container = Container.buildEmpty();
      });

      it('container does not has any comparable info', () => {
        const specInfo = BuildSpectraComparedInfos('just a random value', container);
        expect(specInfo).toEqual([]);
      });

      it('container has comparable info', () => {
        const { extended_metadata } = container;
        const comparableData = {
          file: { name: 'testfile.jdx', id: '1' },
          dataset: { name: 'dataset.title', id: 'dataset.key' },
          analysis: { name: 'analysis.title', id: 'analysis.key' },
          layout: 'layout.title',
        };
        extended_metadata.analyses_compared = [comparableData];

        const specInfo = BuildSpectraComparedInfos('just a random value', container);
        const expectedValue = [{ idx: comparableData.file.id, info: comparableData }]
        expect(specInfo).toEqual(expectedValue);
      });
    });

  });
});
