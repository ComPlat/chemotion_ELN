import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { Button, ButtonToolbar } from 'react-bootstrap';

import { ChemScanner, store } from '../chemscanner/ChemScanner';

import ElementActions from '../actions/ElementActions';

export default class ModalImportChemScanner extends React.Component {
  constructor(props) {
    super(props);

    this.importAll = this.importAll.bind(this);
    this.importSelected = this.importSelected.bind(this);
  }

  importAll() {
    const reactions = store.getState().get('reactions').toJS();
    const molecules = store.getState().get('molecules').toJS();

    ElementActions.importReactionsFromChemScanner({ reactions, molecules });
    this.props.onHide();
  }

  importSelected() {
    const reactions = store.getState().get('reactions').filter(r => r.selected).toJS();
    const molecules = store.getState().get('molecules').filter(m => m.selected).toJS();

    ElementActions.importReactionsFromChemScanner({ reactions, molecules });
    this.props.onHide();
  }

  render() {
    const { onHide } = this.props;

    return (
      <div>
        <div id="chemscannerModal" className="chemscannerModal">
          <ChemScanner modal="chemscannerModal" />
        </div>
        <ButtonToolbar style={{ marginTop: '10px' }}>
          <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
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
