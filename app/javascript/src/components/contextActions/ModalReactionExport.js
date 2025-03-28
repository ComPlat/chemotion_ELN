import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Form, Modal } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import ReportsFetcher from 'src/fetchers/ReportsFetcher';

export default class ModalReactionExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 3
    }
    this.handleClick = this.handleClick.bind(this)
  }

  buttonBar() {
    const { onHide } = this.props;
    return (
      <ButtonToolbar className="justify-content-end gap-1">
        <Button variant="primary" onClick={onHide}>Cancel</Button>
        <Button
          variant="warning"
          id="md-export-dropdown"
          title="Reaction Smiles CSV Export"
          onClick={this.handleClick}
        >
          Smiles Export
        </Button>
      </ButtonToolbar>
    );
  }

  handleClick() {
    const uiState = UIStore.getState();
    const { onHide } = this.props;
    onHide();
    exportSelections(uiState, this.state.value);
  }

  render() {
    const { onHide } = this.props;
    const onChange = (v) => this.setState(
      previousState => { return { ...previousState, value: v } }
    )

    const options = [
      ['starting_materials >> products', 0],
      ['starting_materials.reactants >> products', 1],
      ['starting_materials.reactants.solvents >> products', 2],
      ['starting_materials > reactants > products', 3],
      ['starting_materials > reactants.solvents > products', 4],
      ['starting_materials > reactants > solvents > products', 5],
      ['starting_materials , reactants , solvents , products', 6],
    ];

    return (
      <Modal show onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Reaction smiles export</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" name="options" value={this.state.value}>
              {options.map(([label, value]) => (
                <Form.Check
                  key={`reaction-export-option-${value}`}
                  id={`reaction-export-option-${value}`}
                  type="radio"
                  label={label}
                  onChange={() => onChange(value)}
                  checked={this.state.value == value}
                  value={value}
                />
              ))}
            </Form.Group>
            {this.buttonBar()}
          </Form>
        </Modal.Body>
      </Modal>
    );
  }
}

ModalReactionExport.propTypes = {
  onHide: PropTypes.func,
}

const exportSelections = (uiState, e) => {
  ReportsFetcher.createDownloadFile({
    exportType: e,
    uiState: filterUIState(uiState),
    columns: {}
  }, '', 'export_reactions_from_selections');
}

const filterUIState = (uiState) => {
  const { currentCollection, sample, reaction, wellplate, isSync } = uiState;
  return {
    sample: {
      checkedIds: sample.checkedIds.toArray(),
      uncheckedIds: sample.uncheckedIds.toArray(),
      checkedAll: sample.checkedAll,
    },
    reaction: {
      checkedIds: reaction.checkedIds.toArray(),
      uncheckedIds: reaction.uncheckedIds.toArray(),
      checkedAll: reaction.checkedAll,
    },
    wellplate: {
      checkedIds: wellplate.checkedIds.toArray(),
      uncheckedIds: wellplate.uncheckedIds.toArray(),
      checkedAll: wellplate.checkedAll,
    },
    currentCollection: currentCollection.id,
    isSync: isSync,
  }
}
