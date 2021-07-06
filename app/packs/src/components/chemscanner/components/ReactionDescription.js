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

    const steps = reaction.get('steps').toJS();
    const rId = reaction.get('id');

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
        {steps.map(step => (
          <div key={`reaction-${rId}-${step.number}`}>
            <Label bsStyle="info">step {step.number}</Label>
            <ul>
              {
                ['description', 'temperature', 'time'].map((prop) => {
                  const val = step[prop];
                  const key = `reaction-${rId}-step-${step.number}-${prop}`;
                  if (!val || val === '\n') return <span key={key} />;

                  return (
                    <li key={key}>
                      <b>{prop}: </b>
                      {val}
                    </li>
                  );
                })
              }
              <li key={`reaction-${rId}-step-${step.number}-reagents`}>
                <b>reagents: </b>
                <ul>
                  {step.reagents.map(x => <li key={`${rId}-${step.number}-${x}`}>{x}</li>)}
                </ul>
              </li>
            </ul>
          </div>
        ))}
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

