import PropTypes from 'prop-types';
import React from 'react';

const FileItemImportedRenderer = ({ node }) => {
  const { data } = node;
  const { type, isImported } = data;
  if (type.endsWith('Summary')) return <span />;

  let style;
  let icon;

  if (isImported) {
    style = { color: '#5cb85c' };
    icon = 'check-circle';
  } else {
    style = {};
    icon = 'check-circle-o';
  }

  return (
    <div style={{ paddingLeft: '30px' }}>
      <i style={style} className={`fa fa-${icon}`} />
    </div>
  );
};

FileItemImportedRenderer.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired
};

export default FileItemImportedRenderer;
