import React from 'react';
import { FormGroup, ControlLabel } from 'react-bootstrap';

import { catalyst } from '../staticDropdownOptions/reagents/catalyst';
import { chiralAuxiliaries } from '../staticDropdownOptions/reagents/chiral_auxiliaries';
import { couplingReagents } from '../staticDropdownOptions/reagents/coupling_reagents';
import { fluorination } from '../staticDropdownOptions/reagents/fluorination';
import { halogenationBrClI } from '../staticDropdownOptions/reagents/halogenation_BrClI';
import { ionicLiquids } from '../staticDropdownOptions/reagents/ionic_liquids';
import { lewisAcids } from '../staticDropdownOptions/reagents/lewis_acids';
import { ligands } from '../staticDropdownOptions/reagents/ligands';
import { metallorganics } from '../staticDropdownOptions/reagents/metallorganics';
import { orgBases } from '../staticDropdownOptions/reagents/org_bases';
import { organoboron } from '../staticDropdownOptions/reagents/organoboron';
import { organocatalysts } from '../staticDropdownOptions/reagents/organocatalysts';
import { oxidation } from '../staticDropdownOptions/reagents/oxidation';
import { phaseTransferReagents } from '../staticDropdownOptions/reagents/phase_transfer_reagents';
import { reducingReagents } from '../staticDropdownOptions/reagents/reducing_reagents';
import { solvents } from '../staticDropdownOptions/reagents/solvents';

import SelectWrapper from './SelectWrapper';

function partitionSolventsReagents(value) {
  const selectedSolvents = [];
  const selectedReagents = [];

  value.split(',').forEach((x) => {
    if (Object.values(solvents).indexOf(x) > -1) {
      selectedSolvents.push(x);
    } else {
      selectedReagents.push(x);
    }
  });

  return {
    solvents: selectedSolvents,
    reagents: selectedReagents
  };
}

class SmilesEditing extends React.Component {
  constructor(props) {
    super(props);

    this.reagentsOpts = Object.assign(
      {}, ionicLiquids, catalyst, ligands,
      chiralAuxiliaries, couplingReagents, halogenationBrClI, fluorination,
      orgBases, lewisAcids, organocatalysts, organoboron, metallorganics,
      oxidation, reducingReagents, phaseTransferReagents
    );

    const partition = partitionSolventsReagents(props.value);
    this.state = {
      selectedReagents: partition.reagents,
      selectedSolvents: partition.solvents
    };

    this.onSelect = this.onSelect.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { value } = nextProps;

    const partition = partitionSolventsReagents(value);
    this.setState({
      selectedReagents: partition.reagents,
      selectedSolvents: partition.solvents
    });
  }

  onSelect(selected) {
    const { editFunc } = this.props;
    const { selectedReagents, selectedSolvents } = this.state;

    let selectedArr = selected.value.split(',');
    if (selected.type === 'Solvents') {
      selectedArr = selectedArr.concat(selectedReagents);
    } else {
      selectedArr = selectedArr.concat(selectedSolvents);
    }

    selectedArr = [...new Set(selectedArr.filter(x => x))];
    editFunc(selectedArr.join(','));
  }

  render() {
    const { disabled } = this.props;
    const { selectedReagents, selectedSolvents } = this.state;

    return (
      <div className="chemread-smiles-menu">
        <FormGroup>
          <ControlLabel>Solvents</ControlLabel>
          <SelectWrapper
            disabled={disabled}
            obj={solvents}
            onSelect={this.onSelect}
            title="Solvents"
            value={selectedSolvents.join(',')}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Reagents</ControlLabel>
          <SelectWrapper
            disabled={disabled}
            obj={this.reagentsOpts}
            onSelect={this.onSelect}
            title="All options"
            optionHeight={50}
            value={selectedReagents.join(',')}
          />
        </FormGroup>
      </div>
    );
  }
}

SmilesEditing.propTypes = {
  editFunc: React.PropTypes.func.isRequired,
  value: React.PropTypes.string,
  disabled: React.PropTypes.bool
};

SmilesEditing.defaultProps = {
  value: '',
  disabled: true
};

export default SmilesEditing;
