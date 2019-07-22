const evalMsg = (score) => {
  if (score === 'incomplete analysis') {
    return 'MS, 13C NMR and 1H NMR must exist.';
  } else if (score <= -4) {
    return 'Your data seems to contain errors according to your analysis. Please check the description of the analysis’ content.';
  } else if (score <= -3) {
    return 'Your analysis might be right, but we are unable to approve it without data and additional information. Please add data or refer your data to already submitted samples with full analysis.';
  } else if (score <= -1) {
    return 'Your analysis might be right, please add data to approve it.';
  } else if (score <= 0) {
    return 'Data to your analyses is detected but a reliable automated evaluation is not possible.';
  } else if (score <= 4) {
    return 'Check your data, the data does not reflect your analysis.';
  } else if (score <= 7) {
    return 'Check your data, the data does not reflect your analysis in a comprehensive way.';
  } else if (score <= 9) {
    return 'Your data is almost complete, please check for further data available.';
  } else if (score <= 10) {
    return 'Your data is consistent with the theoretically expected ones, thank you!';
  }
  return 'Unknown status.';
};

const isDisabled = ({ dav, qck, conclusion }) => {
  const { ansQck } = qck;
  return dav === undefined && ansQck === undefined && conclusion === undefined;
};

const isIncompDf = ({ dav, qck }) => qck && dav === undefined; // no dav, yes qck

const isQckGood = ({ qck }) => qck.ansQck;

const isQcpGood = ({ conclusion }) => conclusion;

const isOnlyPrc = ({ dav, conclusion }) => dav !== undefined && conclusion === undefined;
const isMorePrc = ({ dav, conclusion }) => dav !== undefined && conclusion !== undefined;

const evalScoreStd1 = (ansHnmr, ansCnmr, ansMs, ansIr) => {
  // Disabled = no dav, no qck, no conclusion // one column black
  const nonZeroDisabled = isDisabled(ansHnmr)
    || isDisabled(ansCnmr) || isDisabled(ansMs);
  if (nonZeroDisabled) return 'nonZeroDisabled';
  // IncompDf = no dav, yes qck // only qck in one column
  const nonZeroIncompDf = isIncompDf(ansHnmr)
    || isIncompDf(ansCnmr) || isIncompDf(ansMs);
  if (nonZeroIncompDf && isDisabled(ansIr)) {
    if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs)) return -2;
    return -4;
  } else if (nonZeroIncompDf && ansIr.qck.ansQck === false) {
    if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs)) return -1;
    return -3;
  }
  // each column has qck & dav
  if (!nonZeroDisabled && !nonZeroIncompDf) {
    // 1H,13C,MS are good
    if (isQcpGood(ansHnmr) && isQcpGood(ansCnmr) && isQcpGood(ansMs)
        && isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs)
    ) {
      if (isQcpGood(ansIr)) return 10;
      if (isOnlyPrc(ansIr)) return 8;
      return 7;
    }
    // ONE only processed
    if (isMorePrc(ansHnmr) && isMorePrc(ansCnmr) && isOnlyPrc(ansMs)) {
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansHnmr) && isQcpGood(ansCnmr) && isQcpGood(ansIr)) return 9; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansHnmr) && isQcpGood(ansCnmr)) return 8; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansCnmr) && isQcpGood(ansIr)) return 7; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansCnmr)) return 6; // eslint-disable-line
      return 0;
    }
    if (isOnlyPrc(ansHnmr) && isMorePrc(ansCnmr) && isMorePrc(ansMs)) {
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansCnmr) && isQcpGood(ansMs) && isQcpGood(ansIr)) return 7; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansCnmr) && isQcpGood(ansMs)) return 6; // eslint-disable-line
      return 0;
    }
    if (isMorePrc(ansHnmr) && isOnlyPrc(ansCnmr) && isMorePrc(ansMs)) {
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansHnmr) && isQcpGood(ansMs) && isQcpGood(ansIr)) return 7; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansHnmr) && isQcpGood(ansMs)) return 6; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansMs) && isQcpGood(ansIr)) return 5; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansMs)) return 4; // eslint-disable-line
      return 0;
    }
    // TWO only processed
    if (isOnlyPrc(ansHnmr) && isOnlyPrc(ansCnmr) && isMorePrc(ansMs)) {
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansMs) && isQcpGood(ansIr)) return 3; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansMs)) return 2; // eslint-disable-line
      return 0;
    }
    if (isOnlyPrc(ansHnmr) && isMorePrc(ansCnmr && isOnlyPrc(ansMs))) {
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansCnmr) && isQcpGood(ansIr)) return 3; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansCnmr)) return 2; // eslint-disable-line
      return 0;
    }
    if (isMorePrc(ansHnmr) && isOnlyPrc(ansCnmr) && isOnlyPrc(ansMs)) {
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansHnmr) && isQcpGood(ansIr)) return 3; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansHnmr)) return 2; // eslint-disable-line
      return 0;
    }
    // THREE only processed
    if (isOnlyPrc(ansHnmr) && isOnlyPrc(ansCnmr) && isOnlyPrc(ansMs)) {
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs) && isQcpGood(ansIr)) return 3; // eslint-disable-line
      if (isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs)) return 2; // eslint-disable-line
      return 0;
    }
  }
  return 0;
};

const evalScore = (ansHnmr, ansCnmr, ansMs, ansIr, curation) => {
  switch (curation) {
    case 1:
      return 'Unknow curation.';
    case 2:
    default:
      return evalScoreStd1(ansHnmr, ansCnmr, ansMs, ansIr);
  }
};

const evalCurTitle = (curation) => {
  switch (curation) {
    case 1:
      return 'No curation standard';
    case 2:
    default:
      return 'Standard: Curation standard I: experimental organic chemistry';
  }
};

const evalLabel = (score) => {
  if (typeof score === 'string') return 'box-qcsum-score bc-bs-dark';
  if (score === 0) return 'box-qcsum-score bc-bs-warning';
  return score > 0
    ? 'box-qcsum-score bc-bs-success'
    : 'box-qcsum-score bc-bs-danger';
};

const evalScoreTxt = (score) => {
  if (typeof score === 'string') return '-';
  return score;
};

export { evalMsg, evalScore, evalLabel, evalScoreTxt, evalCurTitle };
