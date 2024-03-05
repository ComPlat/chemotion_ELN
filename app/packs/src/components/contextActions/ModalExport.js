import React from 'react';
import { Button, ButtonToolbar, DropdownButton, MenuItem } from 'react-bootstrap';
import CheckBoxs from '../common/CheckBoxs';
import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';
import ReportsFetcher from './../fetchers/ReportsFetcher';

const filterUIState = (uiState) => {
  const {
    currentCollection, sample, reaction, wellplate, isSync
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
    isSync,
  };
};

const exportSelections = (uiState, userState, columns, e) => {
  ReportsFetcher.createDownloadFile({ exportType: e, uiState: filterUIState(uiState), columns });
};

export default class ModalExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: {
        sample: [
          {value: ["sample_svg_file", "molecule_svg_file"], text: "image", checked: false},
          {value: "name", text: "name", checked: true},
          {value: "molecule_name", text: "molecule name", checked: false},
          {value: "external_label", text: "external label", checked: true},
          {value: "short_label", text: "short label", checked: false},
          {value: "description", text: "description", checked: false},
          {value: ["real_amount_value", "real_amount_unit"], text: "real amount", checked: true},
          {value: ["target_amount_value", "target_amount_unit"], text: "target amount", checked: false},
          {value: ["molarity_value", "molarity_unit"], text: "molarity", checked: false},
          {value: "density", text: "density", checked: false},
          {value: "molfile", text: "molfile", checked: false},
        //  {value: "purity", text: "purity", checked: false},
          {value: "solvent", text: "solvent", checked: false},
          {value: "location", text: "location", checked: false},
          {value: "is_top_secret", text: "is top secret?", checked: false},
        //  {value: "ancestry", text: "ancestry", checked: false},
          {value: "imported_readout", text: "imported readout", checked: false},
        //  {value: "identifier", text: "identifier", checked: false},
          {value: "melting_point", text: "melting point", checked: false},
          {value: "boiling_point", text: "boiling point", checked: false},
          {value: "created_at", text: "created at", checked: true},
          {value: "updated_at", text: "updated at", checked: false},
          {value: "user_labels", text: "user labels", checked: false},
        ],
        molecule: [
          {value: "cano_smiles", text: "canonical smiles", checked: true},
          {value: "inchistring", text: "InChIstring", checked: false},
          {value: "inchikey", text: "InChIkey", checked: false},
          {value: "sum_formular", text: "sum formula", checked: false},
          {value: "molecular_weight", text: "molecular weight", checked: false},
        ],
        reaction: [
          {value: "name", text: "reaction name", checked: true},
          {value: "short_label", text: "r short label", checked: true},
          {value: "reference", text: "reference", checked: false},
          {value: "equivalent", text: "equivalent", checked: false},
        ],
        wellplate: [
          {value: "name", text: "wellplate name", checked: false},
          {value: "position_x", text: "well x", checked: false},
          {value: "position_y", text: "well y", checked: false},
        ],
        analyses: [
          { value: "name", text: "analysis name", checked: false },
          { value: "description", text: "analysis description", checked: false },
          { value: "kind", text: "analysis type", checked: false },
          { value: "content", text: "analysis content", checked: false },
          { value: "status", text: "analysis status", checked: false },
          { value: "uuid", text: "uuid", checked: false },
          { value: "dataset name", text: "dataset name", checked: false },
          { value: "dataset description", text: "dataset description", checked: false },
          { value: "instrument", text: "instrument", checked: false },
          { value: "filename", text: "file name", checked: false },
          { value: "checksum", text: "file checksum", checked: false },
        ],
      },
      checkedAllColumns: {
        sample: true,
        molecule: true,
        wellplate: false,
        reaction: false,
        analysis: false,
      },
    };
    this.handleClick = this.handleClick.bind(this)
  }

  toggleColumns(text, checked, section) {
    this.setState((prevState) => {
      const { columns } = prevState;
      columns[section] = columns[section].map((col) => {
        if (col.text === text) {
          return Object.assign({}, col, { checked: !checked })
        }
        return col
      })
      return {...prevState, columns}
    })
  }

  toggleColumnsSample(text, checked) {
    this.toggleColumns(text, checked, 'sample');
  }

  toggleColumnsReaction(text, checked) {
    this.toggleColumns(text, checked, 'reaction');
  }

  toggleColumnsMolecule(text, checked) {
    this.toggleColumns(text, checked, 'molecule');
  }

  toggleColumnsWellplate(text, checked) {
    this.toggleColumns(text, checked, 'wellplate');
  }

  toggleColumnsAnalyses(text, checked) {
    this.toggleColumns(text, checked, 'analyses');
  }

  toggleColumnsAll(section) {
    this.setState((prevState) => {
      const { columns, checkedAllColumns } = prevState;
      checkedAllColumns[section] = !checkedAllColumns[section]
      columns[section] = columns[section].map(
        col => Object.assign({}, col, { checked: checkedAllColumns[section] })
      );
      return { columns, checkedAllColumns };
    })
  }

  toggleColumnsAllSample(text, checked) {
    this.toggleColumnsAll('sample');
  }

  toggleColumnsAllReaction(text, checked) {
    this.toggleColumnsAll('reaction');
  }

  toggleColumnsAllMolecule(text, checked) {
    this.toggleColumnsAll('molecule');
  }

  toggleColumnsAllWellplate(text, checked) {
    this.toggleColumnsAll('wellplate');
  }

  toggleColumnsAllAnalyses(text, checked) {
    this.toggleColumnsAll('analyses');
  }

  buttonBar() {
    const { onHide } = this.props;
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
            <DropdownButton dropup bsStyle="warning" id="md-export-dropdown"
                title="XLSX/SD Export" onSelect={this.handleClick}>
              <MenuItem eventKey="1">XLSX Export</MenuItem>
              <MenuItem eventKey="2">SDF Export</MenuItem>
            </DropdownButton>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>
    )
  }

  handleClick(e) {
    const uiState = UIStore.getState();
    const userState = UserStore.getState();
    const { onHide } = this.props;
    onHide();
    exportSelections(uiState, userState, this.filteredColumns(), e);
  }

  filteredColumns() {
    const { columns } = this.state;
    const tables = Object.keys(columns);
    return tables.reduce((filteredtables, table) => {
      filteredtables[table] = (columns[table] || []).reduce(
        (cols, column) => (column && column.checked ? cols.concat(column.value) : cols),
        []
      );
      return filteredtables;
    }, {});
  }

  chainedItems(items) {
    return items.map(item => {
      return !item.checked
        ? item.value
        : null
    }).filter(r => r != null);
  }

  render() {
    const uiState = UIStore.getState();
    return (
      <div>
        <div className='export-container'>
          <h4>Sample properties</h4>
          <CheckBoxs  items={this.state.columns.sample}
            toggleCheckbox={this.toggleColumnsSample.bind(this)}
            toggleCheckAll={this.toggleColumnsAllSample.bind(this)}
            checkedAll={this.state.checkedAllColumns.sample}
          />
          <h4>Molecule properties</h4>
          <CheckBoxs  items={this.state.columns.molecule}
            toggleCheckbox={this.toggleColumnsMolecule.bind(this)}
            toggleCheckAll={this.toggleColumnsAllMolecule.bind(this)}
            checkedAll={this.state.checkedAllColumns.molecule}
          />
          <h4>Reaction properties</h4>
          <CheckBoxs  items={this.state.columns.reaction}
            toggleCheckbox={this.toggleColumnsReaction.bind(this)}
            toggleCheckAll={this.toggleColumnsAllReaction.bind(this)}
            checkedAll={this.state.checkedAllColumns.reaction}
          />
          <h4>Wellplate and well properties</h4>
          <CheckBoxs  items={this.state.columns.wellplate}
            toggleCheckbox={this.toggleColumnsWellplate.bind(this)}
            toggleCheckAll={this.toggleColumnsAllWellplate.bind(this)}
            checkedAll={this.state.checkedAllColumns.wellplate}
          />
          <h4>Analyses</h4>
          <CheckBoxs  items={this.state.columns.analyses}
            toggleCheckbox={this.toggleColumnsAnalyses.bind(this)}
            toggleCheckAll={this.toggleColumnsAllAnalyses.bind(this)}
            checkedAll={this.state.checkedAllColumns.analyses}
          />
        </div>
        {this.buttonBar()}
      </div>
    )
  }
}
