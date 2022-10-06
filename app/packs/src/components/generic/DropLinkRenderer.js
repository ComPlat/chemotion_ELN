/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import UIStore from 'src/stores/alt/stores/UIStore';

const linkSample = (type, id) => {
  const { currentCollection, isShared } = UIStore.getState();
  const collectionUrl = (!isNaN(id)) ?
    `${currentCollection.id}/${type}/${id}` : `${currentCollection.id}/${type}`;
  Aviator.navigate(isShared ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`);
};

const DropLinkRenderer = (props) => {
  const { sField, node } = props;
  const dId = ((node.data[sField.id] || {}).value || {}).el_id || '';
  const dVal = ((node.data[sField.id] || {}).value || {}).el_short_label || ' ';
  if (dId === '') return <div />;
  return (
    <a role="link" onClick={() => linkSample('sample', dId)} style={{ cursor: 'pointer' }}>
      <span className="reaction-material-link">{dVal}</span>
    </a>
  );
};

DropLinkRenderer.propTypes = {
  sField: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired
};

export default DropLinkRenderer;
