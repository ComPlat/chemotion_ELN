import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { Button, ButtonToolbar } from 'react-bootstrap';

import ChemScannerContainer from '../chemscanner/ChemScannerContainer';

import ElementActions from '../actions/ElementActions';

function retrieveFromChemScanner(cs) {
  const cloneCs = _.cloneDeep(cs);
  if (cs.comment) {
    cloneCs.description.reaction.description += `\n${cs.comment}`;
  }
  const {
    description, details, reactants_smiles, reagents_smiles, products_smiles
  } = cloneCs;

  return ({
    description,
    details,
    reactants: reactants_smiles,
    reagents: reagents_smiles,
    products: products_smiles,
  });
}

export default class ModalImportChemScanner extends React.Component {
  constructor(props) {
    super(props);

    this.onHide = this.onHide.bind(this);
    this.importAll = this.importAll.bind(this);
    this.importSelected = this.importSelected.bind(this);
    this.importReactions = this.importReactions.bind(this);
  }

  onHide() {
    this.props.onHide();
  }

  importAll() {
    const { files } = this.chemscanner.state;

    let importList = [];
    files.forEach((f) => {
      const infoList = f.cds.reduce((acc, cd) => (
        acc.concat(cd.info.map(x => retrieveFromChemScanner(x)))
      ), []);

      importList = importList.concat(infoList);
    });
    this.importReactions(importList);
  }

  importSelected() {
    const { files, selected } = this.chemscanner.state;

    const importList = [];
    selected.forEach((x) => {
      const fileIdx = files.findIndex(f => f.uid === x.uid);
      const info = files[fileIdx].cds[x.cdIdx].info[x.smiIdx];

      importList.push(retrieveFromChemScanner(info));
    });
    this.importReactions(importList);
  }

  importReactions(iList) {
    ElementActions.importReactionsFromChemScanner(iList);
    this.onHide();
  }

  render() {
    return (
      <div style={{ height: '100%' }}>
        <div id="chemscannerModal" className="chemscannerModal">
          <ChemScannerContainer
            modal="chemscannerModal"
            ref={(chemscanner) => { this.chemscanner = chemscanner; }}
          />
        </div>
        <ButtonToolbar style={{ marginRight: '10px' }}>
          <Button bsStyle="primary" onClick={this.onHide}>Cancel</Button>
          <Button bsStyle="warning" onClick={this.importSelected} >
            Import Selected
          </Button>
          <Button bsStyle="warning" onClick={this.importAll} >
            Import All
          </Button>
        </ButtonToolbar>
      </div>
    );
  }
}

ModalImportChemScanner.propTypes = {
  onHide: PropTypes.func.isRequired,
};
