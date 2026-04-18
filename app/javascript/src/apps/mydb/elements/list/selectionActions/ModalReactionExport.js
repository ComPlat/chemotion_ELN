import React from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import UIStore from 'src/stores/alt/stores/UIStore';
import ReportsFetcher from 'src/fetchers/ReportsFetcher';

function filterUIState(uiState) {
  const {
    currentCollection,
    sample,
    reaction,
    wellplate,
  } = uiState;

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
  };
}

function exportSelections(uiState, exportType) {
  ReportsFetcher.createDownloadFile({
    exportType,
    uiState: filterUIState(uiState),
    columns: {}
  }, '', 'export_reactions_from_selections');
}

export default class ModalReactionExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 3
    };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const { value } = this.state;
    const uiState = UIStore.getState();
    const { onHide } = this.props;
    onHide();
    exportSelections(uiState, value);
  }

  render() {
    const { onHide } = this.props;
    const { value } = this.state;
    const onChange = (v) => this.setState(
      (previousState) => ({ ...previousState, value: v })
    );

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
      <AppModal
        show
        onHide={onHide}
        title="Reaction Smiles Export"
        primaryActionLabel="Smiles Export"
        onPrimaryAction={this.handleClick}
      >
        <Form>
          <Form.Group className="mb-3" name="options" value={value}>
            {options.map(([label, optionValue]) => (
              <Form.Check
                key={`reaction-export-option-${optionValue}`}
                id={`reaction-export-option-${optionValue}`}
                type="radio"
                label={label}
                onChange={() => onChange(optionValue)}
                checked={optionValue === value}
                value={optionValue}
              />
            ))}
          </Form.Group>
        </Form>
      </AppModal>
    );
  }
}

ModalReactionExport.propTypes = {
  onHide: PropTypes.func.isRequired,
};
