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
        .then((rawJcamp) => {
          dispatch({ rawJcamp, spcInfo });
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  SaveToFile(sample, spcInfo, peaks, shift) {
    return (dispatch) => {
      AttachmentFetcher.saveSpectrum(peaks, shift, spcInfo.idx)
        .then((rawJcamp) => {
          dispatch({ rawJcamp, spcInfo, fetch: true });
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }
}

export default alt.createActions(SpectraActions);
