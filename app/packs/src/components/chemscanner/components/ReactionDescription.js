import Immutable from 'immutable';
import React from 'react';
import PropTypes from 'prop-types';
import { Label } from 'react-bootstrap';

import MoleculeDescription from './MoleculeDescription';
import EditableText from './EditableText';

export default class ReactionDescription extends React.Component {
  constructor(props) {
    super(props);

    this.updateReactionField = this.updateReactionField.bind(this);
    this.updateMoleculeField = this.updateMoleculeField.bind(this);
  }

  updateReactionField(id, field, value) {
    this.props.updateItemField(id, 'reactions', field, value);
  }

  updateMoleculeField(id, field, value) {
    this.props.updateItemField(id, 'molecules', field, value);
  }

  render() {
    const {
      reaction, reactants, reagents, solvents, products, toggleAliasPolymer
    } = this.props;

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
    const rId = reaction.get('externalId');

    return (
      <React.Fragment>
        <div style={{ maxWidth: '30%' }}>
          <Label>reaction</Label>
          <ul>
            <li key="scanned-reaction-status">
              <b>status: </b>
              {statusLabel}
            </li>
            {Object.keys(rDesc).map(k => (
              <li key={k}>
                <EditableText
                  field={k}
                  value={rDesc[k].toString()}
                  id={reaction.get('id')}
                  onFinishUpdate={this.updateReactionField}
                />
              </li>
            ))}
          </ul>
        </div>
        {reactants.map((m, idx) => (
          <MoleculeDescription
            key={`reactant_${m.get('externalId')}`}
            label={`Reactant ${idx + 1}`}
            molecule={m}
            toggleAliasPolymer={toggleAliasPolymer}
            updateMoleculeField={this.updateMoleculeField}
          />
        ))}
        {reagents.filter(m => m.get('externalId')).map((m, idx) => (
          <MoleculeDescription
            key={`reagent_${m.get('externalId')}`}
            label={`Reagent ${idx + 1}`}
            molecule={m}
            toggleAliasPolymer={toggleAliasPolymer}
            updateMoleculeField={this.updateMoleculeField}
          />
        ))}
        {solvents.filter(m => m.get('externalId')).map((m, idx) => (
          <MoleculeDescription
            key={`solvent_${m.get('externalId')}`}
            label={`Solvent ${idx + 1}`}
            molecule={m}
            toggleAliasPolymer={toggleAliasPolymer}
            updateMoleculeField={this.updateMoleculeField}
          />
        ))}
        {products.map((m, idx) => (
          <MoleculeDescription
            key={`product_${m.get('externalId')}`}
            label={`Product ${idx + 1}`}
            molecule={m}
            toggleAliasPolymer={toggleAliasPolymer}
            updateMoleculeField={this.updateMoleculeField}
          />
        ))}
        {steps.map(step => (
          <div
            key={`reaction-${rId}-${step.stepNumber}`}
            style={{ maxWidth: '40%' }}
          >
            <Label bsStyle="info">step {step.stepNumber}</Label>
            <ul>
              {
                ['description', 'temperature', 'time'].map((prop) => {
                  const val = step[prop];
                  const key = `reaction-${rId}-step-${step.number}-${prop}`;
                  if (!val || val === '\n') return <span key={key} />;

                  return (
                    <li key={key}>
                      <EditableText
                        field={prop}
                        value={val}
                        id={reaction.get('id')}
                        onFinishUpdate={this.updateReactionField}
                      />
                    </li>
                  );
                })
              }
              <li key={`reaction-${rId}-step-${step.number}-reagents`}>
                <b>reagents: </b>
                <ul>
                  {step.reagentSmiles.map(x => (
                    <li key={`${rId}-${step.number}-${x}`}>{x}</li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>
        ))}
      </React.Fragment>
    );
  }
}

ReactionDescription.propTypes = {
  reaction: PropTypes.instanceOf(Immutable.Map).isRequired,
  reactants: PropTypes.instanceOf(Immutable.List).isRequired,
  reagents: PropTypes.instanceOf(Immutable.List).isRequired,
  solvents: PropTypes.instanceOf(Immutable.List).isRequired,
  products: PropTypes.instanceOf(Immutable.List).isRequired,
  toggleAliasPolymer: PropTypes.func.isRequired,
  updateItemField: PropTypes.func.isRequired,
};
