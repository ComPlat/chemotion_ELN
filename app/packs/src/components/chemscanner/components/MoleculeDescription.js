import Immutable from 'immutable';
import React from 'react';
import PropTypes from 'prop-types';
import { Label, Button } from 'react-bootstrap';

import EditableText from './EditableText';

class PolymerLabel extends React.Component {
  constructor() {
    super();

    this.onClickLabel = this.onClickLabel.bind(this);
  }

  onClickLabel() {
    const { onClick, atomId } = this.props;
    onClick(atomId);
  }

  render() {
    const { label, isPolymer } = this.props;
    if (!label) return <span />;

    return (
      <Button
        bsSize="xsmall"
        onClick={this.onClickLabel}
        bsStyle={isPolymer ? 'info' : 'default'}
      >
        {label}
      </Button>
    );
  }
}

PolymerLabel.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  atomId: PropTypes.number.isRequired,
  isPolymer: PropTypes.bool
};

PolymerLabel.defaultProps = {
  isPolymer: false
};

function MoleculeDescription({
  molecule, label, toggleAliasPolymer, updateMoleculeField
}) {
  const description = {
    label: molecule.get('label'),
    description: molecule.get('description'),
  };
  const mId = molecule.get('id');

  const setPolymer = (atomIdx) => {
    if (!mId) return;

    toggleAliasPolymer(mId, atomIdx);
  };

  Object.keys(description).forEach((k) => {
    const value = description[k];
    if (!value) delete description[k];
  });

  const aliases = molecule.get('aliases').toJS();
  const polymers = (
    molecule.get('extendedMetadata').get('polymer') || Immutable.List()
  ).toJS();

  const descLength = Object.keys(description).length;
  const aliasesLength = Object.keys(aliases).length;
  if (descLength === 0 && aliasesLength === 0) return <span />;

  let aliasList = <span />;
  const aliasesKeys = Object.keys(aliases);
  if (aliasesKeys.length > 0) {
    aliasList = (
      <li key="alias">
        <b>alias: </b>
        {aliasesKeys.map(k => (
          <PolymerLabel
            key={k}
            label={aliases[k]}
            onClick={setPolymer}
            atomId={parseInt(k, 10)}
            isPolymer={polymers.includes(parseInt(k, 10))}
          />
        ))}
      </li>
    );
  }

  let moleculeLabel = <span />;
  if (label) moleculeLabel = <Label>{label}</Label>;

  return (
    <div style={{ maxWidth: '30%' }}>
      {moleculeLabel}
      <ul>
        {Object.keys(description).map(k => (
          <li key={k}>
            <EditableText
              field={k}
              value={description[k].toString()}
              id={molecule.get('id')}
              onFinishUpdate={updateMoleculeField}
            />
          </li>
        ))}
        {aliasList}
      </ul>
    </div>
  );
}

MoleculeDescription.propTypes = {
  molecule: PropTypes.instanceOf(Immutable.Map).isRequired,
  toggleAliasPolymer: PropTypes.func.isRequired,
  updateMoleculeField: PropTypes.func.isRequired,
  label: PropTypes.string
};

MoleculeDescription.defaultProps = {
  label: '',
};

export default MoleculeDescription;
