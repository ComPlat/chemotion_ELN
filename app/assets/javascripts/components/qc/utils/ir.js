const evaluateIr = (irQc) => {
  const qc = irQc.pred.decision.output.result[0];
  let numFg = 0;
  let numFg80 = 0;
  let numFg90 = 0;
  let posMac80 = 0;
  let posOwn80 = 0;
  let posMac90 = 0;
  let posOwn90 = 0;
  let negMac80 = 0;
  let negOwn80 = 0;
  let negMac90 = 0;
  let negOwn90 = 0;
  qc.fgs.forEach((fg) => {
    numFg += 1;
    if (fg.confidence >= 90.0) {
      numFg90 += 1;
      fg.status === 'accept' ? posMac90 += 1 : negMac90 += 1; // eslint-disable-line
      fg.statusOwner === 'accept' ? posOwn90 += 1 : negOwn90 += 1; // eslint-disable-line
    } else if (fg.confidence >= 80.0) {
      numFg80 += 1;
      fg.status === 'accept' ? posMac80 += 1 : negMac80 += 1; // eslint-disable-line
      fg.statusOwner === 'accept' ? posOwn80 += 1 : negOwn80 += 1; // eslint-disable-line
    }
  });

  const numMac = posMac80 + posMac90 + negMac80 + negMac90;
  const numOwn = posOwn80 + posOwn90 + negOwn80 + negOwn90;
  const ansMac80 = numMac - posMac80 - posMac90 <= 1;
  const ansOwn80 = numOwn - posOwn80 - posOwn90 <= 1;
  const ansMacF90 = negMac90 - 0 <= 0;
  const ansOwnF90 = negOwn90 - 0 <= 0;
  const conclusionIr = ansMac80 && ansOwn80 && ansMacF90 && ansOwnF90;

  return {
    numFg,
    numFg80,
    numFg90,
    numMac,
    numOwn,
    ansMac80,
    ansOwn80,
    ansMacF90,
    ansOwnF90,
    posMac80,
    posOwn80,
    posMac90,
    posOwn90,
    negMac80,
    negOwn80,
    negMac90,
    negOwn90,
    conclusionIr,
  };
};

export { evaluateIr } // eslint-disable-line
