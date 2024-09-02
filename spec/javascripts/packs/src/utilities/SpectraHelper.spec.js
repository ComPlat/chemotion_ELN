import expect from 'expect';
import {
  describe, it, beforeEach
} from 'mocha';
import { FN } from '@complat/react-spectra-editor';
import {
  isNMRKind, BuildSpcInfosForNMRDisplayer,
  JcampIds, BuildSpcInfos, cleaningNMRiumData,
  inlineNotation,
} from 'src/utilities/SpectraHelper';
import Sample from 'src/models/Sample';
import Container from 'src/models/Container';
import { chmosFixture } from '../../../fixture/chmos';

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
