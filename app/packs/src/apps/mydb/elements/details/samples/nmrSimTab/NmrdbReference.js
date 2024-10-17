import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

const ViewAtNmrdb = ({ is13C, smile }) => {
  const nmrdbLink = is13C
    ? `http://www.nmrdb.org/service.php?name=nmr-13c-prediction&smiles=${smile}`
    : `http://www.nmrdb.org/service.php?name=nmr-1h-prediction&smiles=${smile}`;
  return (
    <Button target="_blank" rel="noreferrer" href={nmrdbLink} className="d-flex align-items-center gap-2">
      <span>View directly on</span>
      <i className="nmrdb-logo" />
    </Button>
  );
};

const LinkToNmrdb = () => (
  <div>
    <p className="d-flex align-items-center gap-2">
      <span>Powered by</span>
      <i className="nmrdb-logo" />
    </p>
    <h5>References</h5>
    <p>Banfi, D.; Patiny, L. <a target="_blank" rel="noreferrer" href="https://doi.org/10.2533/chimia.2008.280">www.nmrdb.org: Resurrecting and processing NMR spectra on-line Chimia</a>, 2008, 62(4), 280-281.</p>
    <p>Andrés M. Castillo, Luc Patiny and Julien Wist. <a target="_blank" rel="noreferrer" href="https://doi.org/10.1016/j.jmr.2010.12.008">Fast and Accurate Algorithm for the Simulation of NMR spectra of Large Spin Systems</a>. J of Magnetic Resonance 2011.</p>
    <p>Aires-de-Sousa, M. Hemmer, J. Gasteiger, <a target="_blank" rel="noreferrer" href="https://doi.org/10.1021/ac010737m">Prediction of 1H NMR Chemical Shifts Using Neural Networks</a>, Analytical Chemistry, 2002, 74(1), 80-90.</p>
    <p>Steinbeck, Christoph, Stefan Krause, and Stefan Kuhn, <a target="_blank" rel="noreferrer" href="https://doi.org/10.1021/ci0341363">NMRShiftDB Constructing a Free Chemical Information System with Open-Source Components</a>, J of chemical information and computer sciences, 2003, 43(6): 1733-1739.</p>
  </div>
);

export { ViewAtNmrdb, LinkToNmrdb };

ViewAtNmrdb.propTypes = {
  is13C: PropTypes.bool,
  smile: PropTypes.string,
};
