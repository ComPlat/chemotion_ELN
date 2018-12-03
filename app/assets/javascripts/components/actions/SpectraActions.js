import alt from '../alt';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';

class SpectraActions {
  buildSampOpts(sample) {
    const files = this.extractJcampFiles(sample);
    const options = files.map(f => (
      {
        value: null,
        label: f.filename,
        idx: f.id,
        idAe: f.idAe,
        idAi: f.idAi,
        idDt: f.idDt,
      }
    ));
    return options;
  }

  extractJcampFiles(sample) {
    let files = [];
    sample.analysesContainers().forEach((ae) => {
      ae.children.forEach((ai) => {
        ai.children.forEach((dt) => {
          dt.attachments.forEach((att) => {
            try {
              const fns = att.filename.split('.');
              const ext = fns[fns.length - 1];
              const isJcamp = ext === 'dx' || ext === 'jdx';
              const isApp = ['done', 'non_jcamp', 'backup'].indexOf(att.aasm_state) < 0;
              if (isJcamp && isApp) {
                const file = Object.assign({}, att, {
                  idAe: ae.id, idAi: ai.id, idDt: dt.id,
                });
                files = [...files, file];
              }
            } catch (err) {
              // just ignore
            }
          });
        });
      });
    });
    return files;
  }

  buildOptIdxs(options) {
    const idxs = options.map(opt => (opt.value ? null : opt.idx))
      .filter(r => r != null);
    return idxs;
  }

  InitOpts(sample) {
    const sampOpts = this.buildSampOpts(sample);
    const options = sampOpts.filter((v, i, a) => a.indexOf(v) === i);
    return { options };
  }

  Select(opt) {
    return opt;
  }

  ToggleModal() {
    return null;
  }

  LoadSpectra(sample) {
    const sampOpts = this.buildSampOpts(sample);
    const optIdxs = this.buildOptIdxs(sampOpts);

    return (dispatch) => {
      AttachmentFetcher.fetchFiles(optIdxs)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  SavePeaksToFile(sample, peaks, selectedOpt) {
    const sampOpts = this.buildSampOpts(sample);
    return (dispatch) => {
      AttachmentFetcher.saveSpectraPeaks(peaks, selectedOpt.idx)
        .then((result) => {
          dispatch({ result, options: sampOpts, fetch: true });
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }
}

export default alt.createActions(SpectraActions);
