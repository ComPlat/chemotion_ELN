import expect from 'expect';
import sinon from 'sinon';
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
