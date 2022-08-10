import Immutable from 'immutable';
import React from 'react';
import PropTypes from 'prop-types';
import { Label, Button } from 'react-bootstrap';

class ResinLabel extends React.Component {
  constructor() {
    super();

    this.onClickLabel = this.onClickLabel.bind(this);
  }

  onClickLabel() {
    const {
      onClick, moleculeId, atomId
    } = this.props;
    onClick(moleculeId, atomId);
  }

  render() {
    const { label, resin } = this.props;
    if (!label) return <span />;

    return (
      <Button
        bsSize="xsmall"
        onClick={this.onClickLabel}
        bsStyle={resin ? 'info' : 'default'}
      >
        {label}
      </Button>
    );
  }
}

ResinLabel.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  atomId: PropTypes.number.isRequired,
  moleculeId: PropTypes.number.isRequired,
  resin: PropTypes.bool
};

ResinLabel.defaultProps = {
  resin: false
};

function MoleculeDescription({ molecule, label, toggleResin }) {
  const description = {
    text: molecule.get('description'),
    label: molecule.get('label'),
  };

  Object.keys(description).forEach((k) => {
    const value = description[k];
    if (!value) delete description[k];
  });
  const aliases = molecule.get('alias').toArray().map(alias => alias.toObject());

  if (Object.keys(description).length === 0 && aliases.length === 0) return <span />;

  let aliasList = <span />;
  if (aliases.length > 0) {
    aliasList = (
      <li key="alias">
        <b>alias: </b>
        {aliases.map(alias => (
          <ResinLabel
            key={alias.id}
            label={alias.text}
            onClick={toggleResin}
            atomId={alias.id}
            moleculeId={molecule.get('id')}
            resin={alias.resin}
          />
        ))}
      </li>
    );
  }

  let moleculeLabel = <span />;
  if (label) moleculeLabel = <Label>{label}</Label>;

  return (
    <div>
      {moleculeLabel}
      <ul>
        {Object.keys(description).map(k => (
          <li key={k}>
            <b>{`${k}: `}</b>
            {description[k]}
          </li>
        ))}
        {aliasList}
      </ul>
    </div>
  );
}

MoleculeDescription.propTypes = {
  molecule: PropTypes.instanceOf(Immutable.Map).isRequired,
  toggleResin: PropTypes.func.isRequired,
  label: PropTypes.string
};

MoleculeDescription.defaultProps = {
  label: '',
};

export default MoleculeDescription;
