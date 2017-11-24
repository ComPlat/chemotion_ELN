import React from 'react';
import { MenuItem, ButtonToolbar, DropdownButton } from 'react-bootstrap';

const solventsDropdown = {
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

const reagentsDropdown = {
  'palladium acetate': '[Pd+2].[O-]C(=O)C.[O-]C(=O)C',
  pyridine: 'C1=CN=CC=C1',
  DABCO: 'N12CCN(CC2)CC1'
};

class MenuItemCb extends React.Component {
  constructor() {
    super();

    this.onSelect = this.onSelect.bind(this);
  }

  onSelect() {
    this.props.onSelect(this.props.value);
  }

  render() {
    return (
      <MenuItem onSelect={this.onSelect}> {this.props.children} </MenuItem>
    );
  }
}

function DropdownObjKeys({ obj, onSelect, title }) {
  return (
    <DropdownButton
      id="smiles-editing-solvents-dd"
      bsSize="small"
      title={title}
    >
      {Object.keys(obj).map(k => (
        <MenuItemCb value={obj[k]} key={k} onSelect={onSelect} >
          {k}
        </MenuItemCb>
      ))}
    </DropdownButton>
  );
}

function SmilesEditingDropdown({ editFunc }) {
  return (
    <ButtonToolbar>
      <DropdownObjKeys
        obj={solventsDropdown}
        onSelect={editFunc}
        title="Solvents"
      />
      <DropdownObjKeys
        obj={reagentsDropdown}
        onSelect={editFunc}
        title="Reagents"
      />
    </ButtonToolbar>
  );
}

SmilesEditingDropdown.propTypes = {
  editFunc: React.PropTypes.func.isRequired
};

DropdownObjKeys.propTypes = {
  obj: React.PropTypes.object.isRequired,
  title: React.PropTypes.string,
  onSelect: React.PropTypes.func.isRequired
};

DropdownObjKeys.defaultProps = {
  title: ''
};

MenuItemCb.propTypes = {
  onSelect: React.PropTypes.func.isRequired,
  value: React.PropTypes.string.isRequired,
  children: React.PropTypes.node
};

export default SmilesEditingDropdown;
