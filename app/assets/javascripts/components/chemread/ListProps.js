import React from 'react';
import { Label } from 'react-bootstrap';

function ListProps({ label, listProps }) {
  if (!listProps) return <span />;
  if (Object.values(listProps).filter(x => x).length === 0) return (<span />);

  const list = Object.keys(listProps).filter(x => (
    x !== 'ID' && x !== 'parentID' && listProps[x] && typeof listProps[x] !== 'object'
  ));
  if (list.length === 0) return <span />;

  const propsList = list.map(k => (
    <li key={`${label}_${k}`}>
      <b>{`${k}: `}</b>
      {listProps[k]}
    </li>
  ));

  return (
    <div>
      <Label>{label}</Label>
      <ul>
        {propsList}
      </ul>
    </div>
  );
}

ListProps.propTypes = {
  label: React.PropTypes.string.isRequired,
  listProps: React.PropTypes.object.isRequired
};

export default ListProps;
