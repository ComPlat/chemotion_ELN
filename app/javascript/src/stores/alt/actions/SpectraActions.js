import alt from 'src/stores/alt/alt';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';

class SpectraActions {
  ToggleModal() {
    return null;
  }

  LoadSpectra(spcInfos) {
    const infos = Array.isArray(spcInfos) ? spcInfos : [];
    const groups = infos.reduce((acc, si) => {
      const key = si?.idDt ?? 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(si);
      return acc;
    }, {});

    const selectedInfos = Object.values(groups).flatMap((datasetInfos) => {
      const uvvis = datasetInfos.filter((si) => /(?:^|[._-])uvvis(?:[._-]|$)/.test((si?.label || '').toLowerCase()));
      const tics = datasetInfos.filter((si) => /(?:^|[._-])tic(?:[._-]|$)/.test((si?.label || '').toLowerCase()));
      const ms = datasetInfos.filter((si) => /(?:^|[._-])(mz|ms)(?:[._-]|$)/.test((si?.label || '').toLowerCase()));
      const isLcmsDataset = uvvis.length > 0 && tics.length > 0 && ms.length > 0;
      if (!isLcmsDataset) return datasetInfos;
      // Bootstrap LCMS with UV/TIC only; MS pages are requested on-demand.
      return [...uvvis, ...tics];
    });

    const uniqInfos = selectedInfos.filter((si, index, arr) => index === arr.findIndex((x) => x.idx === si.idx));
    const idxs = uniqInfos.map(si => si.idx);
    console.log('[SpectraActions.LoadSpectra] selected payload', { // eslint-disable-line no-console
      totalInput: infos.length,
      totalRequested: idxs.length,
      requestedIds: idxs,
      requestedLabels: uniqInfos.map((si) => si.label),
    });
    if (idxs.length === 0) {
      return null;
    }

    return (dispatch) => {
      AttachmentFetcher.fetchFiles(idxs)
        .then((fetchedFiles) => {
          dispatch({ fetchedFiles, spcInfos: infos });
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

  SaveToFile(spcInfo, peaksStr, shift, scan, thres, integration, multiplicity, predict, cb, keepPred = false, waveLengthStr, cyclicvolta, curveIdx = 0, simulatenmr = false, previousSpcInfos, isSaveCombined = false, axesUnitsStr, detector, dscMetaData, lcmsPeaksStr, lcmsIntegralsStr, lcmsUvvisWavelength, lcmsMzPage, lcmsMzPageData, onSaved) {
    return (dispatch) => {
      AttachmentFetcher.saveSpectrum(spcInfo.idx, peaksStr, shift, scan, thres, integration, multiplicity, predict, keepPred, waveLengthStr, cyclicvolta, curveIdx, simulatenmr, previousSpcInfos, isSaveCombined, axesUnitsStr, detector, dscMetaData, lcmsPeaksStr, lcmsIntegralsStr, lcmsUvvisWavelength, lcmsMzPage, lcmsMzPageData)
        .then((fetchedFiles) => {
          dispatch({ fetchedFiles, spcInfo });
          if (onSaved) {
            onSaved(fetchedFiles, spcInfo);
          }
          if (cb) {
            cb();
          }
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
          if (onSaved) {
            onSaved(null, spcInfo, errorMessage);
          }
        });
    };
  }

  CombineSpectra(jcampIds, curveIdx, extraParams, cb) {
    return () => {
      AttachmentFetcher.combineSpectra(jcampIds, curveIdx, extraParams)
        .then((combined) => {
          if (cb) cb(combined);
        })
        .catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
          if (cb) cb(null, errorMessage);
        });
    };
  }

  WriteStart(payload) {
    return payload;
  }

  WriteStop() {
    return null;
  }

  InferRunning() {
    return null;
  }

  InferSpectrum(spcInfo, peaksStr, shift, scan, thres, integration, multiplicity, predict,
    targetPeaks, layout,
    cb, keepPred = false,
  ) {
    return (dispatch) => {
      AttachmentFetcher.inferSpectrum(
        spcInfo.idx, peaksStr, shift, scan, thres, integration, multiplicity,
        predict, targetPeaks, layout, keepPred
      ).then((fetchedFiles) => {
        dispatch({ fetchedFiles, spcInfo });
        cb();
      }).catch((errorMessage) => {
        console.log(errorMessage); // eslint-disable-line
      });
    };
  }

  SelectIdx(spcIdx, arrSpcIdx = []) {
    return { spcIdx, arrSpcIdx };
  }

  AddOthers(payload) {
    const jcamps = payload.jcamps || [];
    const jcamp = jcamps[0];

    return (dispatch) => {
      AttachmentFetcher.fetchJcamp({ file: jcamp })
        .then((rsp) => {
          dispatch(rsp);
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  RegenerateEdited(jcampIds, molfile, cb) {
    return (dispatch) => {
      AttachmentFetcher.regenerateEditedSpectrum(jcampIds, molfile)
        .then(() => {
          dispatch();
          cb();
        }).catch((errorMessage) => {
          console.log(errorMessage); // eslint-disable-line
        });
    };
  }

  ToggleModalNMRDisplayer() {
    return null;
  }

  LoadSpectraForNMRDisplayer(spcInfos = []) {
    if (spcInfos.length === 0) return null;
  
    // Split input between .nmrium and JCAMP files
    const nmriumInfos = spcInfos.filter(si =>
      si.label?.toLowerCase().endsWith('.nmrium'),
    );
  
    const jcampExtensions = ['.jdx', '.dx', '.jcamp'];
    const zipExtensions = ['.zip'];
    const jdxInfos = spcInfos.filter(si =>
      jcampExtensions.some(ext => si.label?.toLowerCase().endsWith(ext)),
    );
    const zipInfos = spcInfos.filter(si =>
      zipExtensions.some(ext => si.label?.toLowerCase().endsWith(ext)),
    );
  
    return async (dispatch) => {
      try {
        // Fetch .nmrium
        const nmriumIds = nmriumInfos.map(si => si.idx);
        const nmriumFilesResponse = nmriumIds.length > 0
          ? await AttachmentFetcher.fetchFiles(nmriumIds)
          : [];
  
        // Fetch JCAMP files
        const jdxIds = jdxInfos.map(si => si.idx);
        const jdxUrls = await Promise.all(
          jdxIds.map(id => ThirdPartyAppFetcher.getHandlerUrl(id, 3))
        );

        // Fetch ZIP files
        const zipIds = zipInfos.map(si => {
          return si.idx;
        });
        const zipUrls = await Promise.all(
          zipIds.map(id => ThirdPartyAppFetcher.getHandlerUrl(id, 3))
        );
  
        // Construct list of fetched spectra
        const fetchedSpectra = [
          ...nmriumInfos.map((info, i) => ({
            id: info.idx,
            label: info.label,
            kind: 'nmrium',
            file: nmriumFilesResponse.files[i]?.file,
          })),
          ...jdxInfos.map((info, i) => ({
            id: info.idx,
            label: info.label,
            kind: 'jcamp',
            url: jdxUrls[i],
          })),
          ...zipInfos.map((info, i) => ({
            id: info.idx,
            label: info.label,
            kind: 'zip',
            url: zipUrls[i],
          })),
        ].filter(entry => entry.file || entry.url);
  
        dispatch({ fetchedSpectra, spcInfos });
  
      } catch (error) {
        console.error('LoadSpectraForNMRDisplayer failed:', error);
      }
    };
  }
}

export default alt.createActions(SpectraActions);
