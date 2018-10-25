import React from 'react';
import PropTypes from 'prop-types';
import { Label } from 'react-bootstrap';

function renderReactionStatus(status) {
  if (status === 'Failed') {
    return (<Label bsStyle="danger">Failed</Label>);
  }
  if (status === 'Planned') {
    return (<Label bsStyle="info">Planned</Label>);
  }

  return (<Label bsStyle="success">Success</Label>);
}

function ListProps({ label, listProps, style }) {
  if (!listProps) return <span />;
  if (listProps.constructor === String) {
    return (
      <div style={style}>
        <b>{`${label}: `}</b>
        {listProps}
      </div>
    );
  }

  if (Object.values(listProps).filter(x => x).length === 0) return (<span />);

  const list = Object.keys(listProps).filter(x => (
    x !== 'ID' && x !== 'parentID' && x !== 'mdl'
      && listProps[x] && typeof listProps[x] !== 'object'
  ));
  if (list.length === 0) return <span />;

  const propsList = list.map((k) => {
    const bold = `${k}: `;
    let display = listProps[k];

    if (k === 'status') display = renderReactionStatus(display);

    return (
      <li key={`${label}_${k}`}>
        <b>{bold}</b>
        {display}
      </li>
    );
  });

  return (
    <div style={style}>
      <Label>{label}</Label>
      <ul>
        {propsList}
      </ul>
    </div>
  );
}

ListProps.propTypes = {
  label: PropTypes.string.isRequired,
  // listProps: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object
};

ListProps.defaultProps = {
  style: {}
};

export default ListProps;
