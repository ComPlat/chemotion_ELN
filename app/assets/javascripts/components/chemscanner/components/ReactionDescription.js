import Immutable from 'immutable';
import React from 'react';
import PropTypes from 'prop-types';
import { Label } from 'react-bootstrap';

import MoleculeDescription from './MoleculeDescription';

export default class ReactionDescription extends React.Component {
  constructor(props) {
    super(props);

    this.toggleResin = this.toggleResin.bind(this);
  }

  toggleResin(molId, atomId) {
    const { reaction, toggleResin } = this.props;
    toggleResin(reaction.get('id'), molId, atomId);
  }

  render() {
    const { reaction } = this.props;

    const rDesc = {
      description: reaction.get('description'),
      temperature: reaction.get('temperature'),
      time: reaction.get('time'),
      yield: reaction.get('yield')
    };

    Object.keys(rDesc).forEach((k) => {
      if (!rDesc[k]) delete rDesc[k];
    });

    const status = reaction.get('status');
    let statusClass;
    switch (status) {
      case 'Failed':
        statusClass = 'danger';
        break;
      case 'Planned': {
        statusClass = 'info';
        break;
      }
      default:
        statusClass = 'success';
    }
    const statusLabel = <Label bsStyle={statusClass}>{status}</Label>;

    return (
      <div className="scanned-reaction-desc">
        <div>
          <Label>reaction</Label>
          <ul>
            <li key="scanned-reaction-status">
              <b>status: </b>
              {statusLabel}
            </li>
            {Object.keys(rDesc).map(k => (
              <li key={k}>
                <b>{`${k}: `}</b>
                {rDesc[k]}
              </li>
            ))}
          </ul>
        </div>
        {['reactants', 'reagents', 'products'].reduce((arr, group) => {
          const groupMol = reaction.get(group);
          return arr.concat(groupMol.map((m, idx) => (
            <MoleculeDescription
              key={m.get('id')}
              label={`${group.slice(0, -1)} ${idx + 1}`}
              molecule={m}
              toggleResin={this.toggleResin}
            />
          )));
        }, [])}
      </div>
    );
  }
}

ReactionDescription.propTypes = {
  reaction: PropTypes.instanceOf(Immutable.Map).isRequired,
  toggleResin: PropTypes.func.isRequired,
};

