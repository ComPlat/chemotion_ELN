import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const DragHandle = forwardRef(({ enabled }, ref) => (
  <div
    ref={ref}
    className={classNames('drag-handle', {
      'drag-handle--disabled': !enabled
    })}
  />
));

DragHandle.displayName = 'DragHandle';

DragHandle.propTypes = {
  enabled: PropTypes.bool,
};

DragHandle.defaultProps = {
  enabled: true,
};

export default DragHandle;
