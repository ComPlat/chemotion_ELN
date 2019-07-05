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

const evalScore = (ansHnmr, ansCnmr, ansMs, ansIr) => {
  console.log(ansHnmr)
  if (!ansHnmr.dav || !ansCnmr.dav || !ansMs.dav) return 'incomplete analysis';
  return 10;
};

const evalLabel = (score) => {
  if (typeof score === 'string') return 'box-qcsum-score bc-bs-dark';
  return score > 0
    ? 'box-qcsum-score bc-bs-success'
    : 'box-qcsum-score bc-bs-danger';
};

const evalScoreTxt = (score) => {
  if (typeof score === 'string') return '-';
  return score;
};

export { evalMsg, evalScore, evalLabel, evalScoreTxt };
