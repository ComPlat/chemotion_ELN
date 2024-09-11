import React from 'react';
import PropTypes from 'prop-types';

import { evalCurTitle } from 'src/apps/mydb/elements/details/samples/qcTab/components/summary/eval';

const AreaTitle = ({ curation }) => (
  <div>
    <h4>
      <span>
        Curation aspects of available data
      </span>
    </h4>
    <h4>
      <span className="text-decoration-underline">
        {evalCurTitle(curation)}
      </span>
    </h4>
  </div>
);

AreaTitle.propTypes = {
  curation: PropTypes.number.isRequired,
};

export default AreaTitle;
