import alt from '../alt';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';

class SpectraActions {
  ToggleModal() {
    return null;
  }

  LoadSpectra(spcInfo) {
    const idx = spcInfo && spcInfo.idx;
    if (!idx) {
      return null;
    }

    return (dispatch) => {
      AttachmentFetcher.fetchFiles([idx])
        .then((target) => {
          dispatch({ target, spcInfo });
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  Regenerate(jcampIds, cb) {
    return (dispatch) => {
      AttachmentFetcher.regenerateSpectrum(jcampIds)
        .then(() => {
          dispatch();
          cb();
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  SaveToFile(spcInfo, peaksStr, shift, scan, thres, predict, cb) {
    return (dispatch) => {
      AttachmentFetcher.saveSpectrum(spcInfo.idx, peaksStr, shift, scan, thres, predict)
        .then(() => {
          dispatch();
          cb();
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  InferSpectrum({
    spcInfo, peaks, layout, shift,
  }) {
    return (dispatch) => {
      AttachmentFetcher.inferSpectrum(spcInfo.idx, peaks, layout, shift)
        .then((json) => {
          dispatch(json);
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }
}

export default alt.createActions(SpectraActions);
