import React from 'react';
import PropTypes from 'prop-types';

import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';

const ComputedPropLabel = ({ cprops }) => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const enableComputedProps = MatrixCheck(currentUser.matrix, 'computedProp');
  if (!enableComputedProps || !cprops || cprops.length === 0) return null;
  cprops.sort((a, b) => a.updated_at - b.updated_at);
  const { status } = cprops[cprops.length - 1];

  let statusIcon = '';
  const style = {};
  if (['success', 'completed'].includes(status)) {
    statusIcon = 'fa-calculator';
    style.color = 'green';
  } else if (status === 'pending') {
    statusIcon = 'fa-ellipsis-h';
    style.color = '#f0ad4e';
  } else if (status === 'started') {
    statusIcon = 'fa-spinner fa-spin';
    style.color = '#5bc0de';
  } else if (status === 'failure') {
    statusIcon = 'fa-calculator';
    style.color = 'black';
  }

  return (
    <i className={`fa ${statusIcon}`} style={style} />
  );
};

ComputedPropLabel.propTypes = {
  cprops: PropTypes.arrayOf(PropTypes.object),
};

export default ComputedPropLabel;
