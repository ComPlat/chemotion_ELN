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

const isDisabled = ({ dav, qck, conclusionOwn }) => {
  const { ansQck } = qck;
  return dav === undefined && ansQck === undefined && conclusionOwn === undefined;
};

const isIncompDf = ({ dav, qck }) => qck && dav === undefined; // no dav, yes qck

const isDavGood = ({ dav }) => !!dav;

const isQckGood = ({ qck }) => qck.ansQck;

const isQcpGood = ({ conclusionOwn }) => conclusionOwn;

const isOnlyPrc = ({ dav, conclusionOwn }) => dav !== undefined && conclusionOwn === undefined;
const isMorePrc = ({ dav, conclusionOwn }) => dav !== undefined && conclusionOwn !== undefined;

const evalScoreStd1 = (ansHnmr, ansCnmr, ansMs, ansIr) => {
  const isOneDavFail = !isDavGood(ansHnmr) || !isDavGood(ansCnmr) || !isDavGood(ansMs);
  const isAllQckGood = isQckGood(ansHnmr) && isQckGood(ansCnmr) && isQckGood(ansMs);
  const isQcpGoodBothHnmrCnmr = isQcpGood(ansHnmr) && isQcpGood(ansCnmr);
  const isQcpGoodBothMsIr = isQcpGood(ansMs) && isQcpGood(ansIr);
  const isQcpGoodHnmrOrCnmr = isQcpGood(ansHnmr) || isQcpGood(ansCnmr);
  const isQcpGoodMsOrIr = isQcpGood(ansMs) || isQcpGood(ansIr);

  if (isOneDavFail) return 'nonZeroDisabled';
  if (!isDavGood(ansIr)
    && isAllQckGood
  ) return -2;
  if (!isDavGood(ansIr)) return -4;

  if (isAllQckGood
    && isQcpGoodBothHnmrCnmr && isQcpGoodBothMsIr
  ) return 10;

  if (isAllQckGood
    && isQcpGoodBothHnmrCnmr && isQcpGoodMsOrIr
  ) return 9;

  if (isAllQckGood
    && isQcpGoodBothHnmrCnmr
  ) return 8;

  if (isAllQckGood
    && isQcpGoodHnmrOrCnmr && isQcpGoodBothMsIr
  ) return 7;

  if (isAllQckGood
    && isQcpGoodHnmrOrCnmr && isQcpGoodMsOrIr
  ) return 6;

  if (isAllQckGood
    && isQcpGoodHnmrOrCnmr
  ) return 5;

  if (isAllQckGood
    && isQcpGoodBothMsIr
  ) return 4;

  if (isAllQckGood
    && isQcpGoodMsOrIr
  ) return 3;

  if (isAllQckGood) return 2;

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
