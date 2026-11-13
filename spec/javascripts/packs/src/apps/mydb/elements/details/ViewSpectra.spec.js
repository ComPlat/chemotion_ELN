import expect from 'expect';
import sinon from 'sinon';
import { FN } from '@complat/react-spectra-editor';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';

// refreshOp is exercised on the prototype with a minimal `this`: it only builds the save payloads
// (getSavePayloads, the real one) and hands them to saveOp, so there is nothing to mount.
const refreshWith = (params) => {
  const saveOp = sinon.spy();
  const self = {
    getSavePayloads: ViewSpectra.prototype.getSavePayloads,
    saveOp,
  };
  ViewSpectra.prototype.refreshOp.call(self, params);
  return saveOp;
};

describe('ViewSpectra', () => {
  describe('#getSpcInfo()', () => {
    const spcInfos = [
      { idx: 2, idDt: 10, label: 'run.peak.jdx' },
      { idx: 1, idDt: 10, label: 'run_uvvis.peak.jdx' },
    ];
    const getSpcInfo = (state, curveIdx = 0) => (
      ViewSpectra.prototype.getSpcInfo.call({ state }, curveIdx)
    );

    it('returns the selected file when the UV-Vis file is not selected', () => {
      const spcMetas = [{ idx: 2, jcamp: { layout: FN.LIST_LAYOUT.UVVIS } }];
      const si = getSpcInfo({ spcInfos, spcMetas, spcIdx: 2, arrSpcIdx: [2] });
      expect(si.idx).toEqual(2);
    });

    it('returns the selected file outside an LC/MS selection', () => {
      const spcMetas = [
        { idx: 2, jcamp: { layout: FN.LIST_LAYOUT.UVVIS } },
        { idx: 1, jcamp: { layout: FN.LIST_LAYOUT.UVVIS } },
      ];
      const si = getSpcInfo({ spcInfos, spcMetas, spcIdx: 2, arrSpcIdx: [2, 1] });
      expect(si.idx).toEqual(2);
    });

    it('returns the UV-Vis file for curve 0 of an LC/MS selection', () => {
      const spcMetas = [
        { idx: 2, jcamp: { layout: FN.LIST_LAYOUT.LC_MS } },
        { idx: 1, jcamp: { layout: FN.LIST_LAYOUT.HPLC_UVVIS } },
      ];
      const si = getSpcInfo({ spcInfos, spcMetas, spcIdx: 2, arrSpcIdx: [2, 1] });
      expect(si.idx).toEqual(1);
    });
  });

  describe('#refreshOp()', () => {
    // The shape react-spectra-editor's "Refresh Simulation" button sends: the current curve's
    // state, without a spectra_list.
    const editorState = () => ({
      peaks: [{ x: 7.26, y: 1 }],
      layout: '1H',
      shift: { ref: {}, peak: false, enable: true },
      scan: 0,
      thres: 0,
      curveSt: { curveIdx: 0 },
    });

    it('saves the editor state with simulatenmr when no spectra_list is given', () => {
      const saveOp = refreshWith(editorState());

      sinon.assert.calledOnce(saveOp);
      const [{ spectra_list: spectraList }] = saveOp.firstCall.args;
      expect(spectraList.length).toEqual(1);
      expect(spectraList[0]).toEqual({ ...editorState(), simulatenmr: true });
    });

    it('marks every entry of a given spectra_list for simulation', () => {
      const saveOp = refreshWith({
        spectra_list: [
          { layout: '1H', curveIdx: 0, simulatenmr: false },
          { layout: '1H', curveIdx: 1 },
        ],
      });

      sinon.assert.calledOnce(saveOp);
      const [{ spectra_list: spectraList }] = saveOp.firstCall.args;
      expect(spectraList.map((payload) => payload.simulatenmr)).toEqual([true, true]);
      expect(spectraList.map((payload) => payload.curveIdx)).toEqual([0, 1]);
    });
  });
});
