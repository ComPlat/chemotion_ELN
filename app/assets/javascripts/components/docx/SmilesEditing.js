import React from 'react';
import { FormGroup, ControlLabel } from 'react-bootstrap';
import Select from 'react-select';

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

const solvents = {
  THF: 'C1CCCO1',
  DMF: 'CN(C)C=O',
  DMSO: 'CS(C)=O',
  Chloroform: 'ClC(Cl)Cl',
  'methylene chloride': 'ClCCl',
  acetone: 'CC(C)=O',
  '1,4-dioxane': 'C1COCCO1',
  'ethyl acetate': 'CC(OCC)=O',
  'n-hexane': 'CCCCCC',
  cyclohexane: 'C1CCCCC1',
  'diethyl ether': 'CCOCC',
  methanol: 'CO',
  ethanol: 'OCC',
  water: '[H]O[H]'
};

class SelectWrapper extends React.Component {
  constructor() {
    super();
    this.state = { value: '' };

    this.onSelect = this.onSelect.bind(this);
  }

  onSelect(selected) {
    const { onSelect } = this.props;
    this.setState(
      { value: selected },
      onSelect(selected)
    );
  }

  render() {
    const { obj, title, disabled } = this.props;
    const options = Object.keys(obj).map(k => ({ label: k, value: obj[k] }));

    return (
      <Select
        multi
        disabled={disabled}
        onChange={this.onSelect}
        options={options}
        placeholder={`Select ${title}`}
        simpleValue
        value={this.state.value}
      />
    );
  }
}

function SmilesEditing({ editFunc, disabled }) {
  return (
    <div className="docx-smiles-menu">
      <FormGroup>
        <ControlLabel>Solvents: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={solvents}
          onSelect={editFunc}
          title="Solvents"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Catalysts: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={catalyst}
          onSelect={editFunc}
          title="Catalysts"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Chiral Auxiliaries: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={chiralAuxiliaries}
          onSelect={editFunc}
          title="Chiral Auxiliaries"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Coupling Reagents: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={couplingReagents}
          onSelect={editFunc}
          title="Coupling Reagents"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Fluorination: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={fluorination}
          onSelect={editFunc}
          title="Fluorination"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Halogenation, Br, Cl, I: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={halogenationBrClI}
          onSelect={editFunc}
          title="Halogenation, Br, Cl, I"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Ionic Liquids</ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={ionicLiquids}
          onSelect={editFunc}
          title="Ionic Liquids"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>(Lewis) Acids</ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={lewisAcids}
          onSelect={editFunc}
          title="(Lewis) Acids"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Ligands: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={ligands}
          onSelect={editFunc}
          title="Ligands"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Metallorganics: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={metallorganics}
          onSelect={editFunc}
          title="Metallorganics"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Org Bases: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={orgBases}
          onSelect={editFunc}
          title="Org Bases"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Organoboron: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={organoboron}
          onSelect={editFunc}
          title="Organoboron"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Organocatalysts: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={organocatalysts}
          onSelect={editFunc}
          title="Organocatalysts"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Oxidation: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={oxidation}
          onSelect={editFunc}
          title="Oxidation"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Phase Transfer Reagents: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={phaseTransferReagents}
          onSelect={editFunc}
          title="Phase Transfer Reagents"
        />
      </FormGroup>
      <FormGroup>
        <ControlLabel>Reducing Reagents: </ControlLabel>
        <SelectWrapper
          disabled={disabled}
          obj={reducingReagents}
          onSelect={editFunc}
          title="Reducing Reagents"
        />
      </FormGroup>
    </div>
  );
}

SmilesEditing.propTypes = {
  editFunc: React.PropTypes.func.isRequired,
  disabled: React.PropTypes.bool
};

SmilesEditing.defaultProps = {
  disabled: true
};

SelectWrapper.propTypes = {
  obj: React.PropTypes.object.isRequired,
  title: React.PropTypes.string,
  disabled: React.PropTypes.bool,
  onSelect: React.PropTypes.func.isRequired
};

SelectWrapper.defaultProps = {
  title: '',
  disabled: true
};

export default SmilesEditing;
