import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { range } from 'lodash';
import { Row, Col, Button } from 'react-bootstrap';
import DataGrid from 'react-data-grid';
import { Menu } from 'react-data-grid-addons';
import ResearchPlanDetailsFieldTableContextMenu from './ResearchPlanDetailsFieldTableContextMenu';
import ResearchPlanDetailsFieldTableColumnNameModal from './ResearchPlanDetailsFieldTableColumnNameModal';
import ResearchPlanDetailsFieldTableSchemasModal from './ResearchPlanDetailsFieldTableSchemasModal';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import uniqueId from 'react-html-id';

const { ContextMenuTrigger } = Menu;

// regexp to parse tap separated paste from the clipboard
const defaultParsePaste = str => (
  str.split(/\r\n|\n|\r/).map(row => row.split('\t'))
);

// Monkey path for ReactDataGrid
// see https://github.com/adazzle/react-data-grid/issues/1416#issuecomment-445488607
// this works for react-data-grid 6.1.0, hopefully it will be fixed in the future
class FixedReactDataGrid extends DataGrid {
  componentDidMount() {
    this._mounted = true;
    window.addEventListener('resize', this.metricsUpdated);
    if (this.props.cellRangeSelection) {
      this.grid.addEventListener('mouseup', this.onWindowMouseUp);
    }
    this.metricsUpdated();
  }

  componentWillUnmount() {
    this._mounted = false;
    window.removeEventListener('resize', this.metricsUpdated);
    this.grid.removeEventListener('mouseup', this.onWindowMouseUp);
  }
}

export default class ResearchPlanDetailsFieldTable extends Component {

  constructor(props) {
    super(props);
    this.state = {
      update: this.props.update,
      columnNameModal: {
        show: false,
        idx: null
      },
      schemaModal: {
        show: false
      },
      selection: {}
    };

    uniqueId.enableUniqueIds(this)

    document.addEventListener('copy', this.handleCopy.bind(this));
    document.addEventListener('paste', this.handlePaste.bind(this));

    this.ref = React.createRef();

    this.handleCellSelected = this.handleCellSelected.bind(this);
    this.handleCellDeSelected = this.handleCellDeSelected.bind(this);
  }

  componentDidUpdate() {
    if (this.state.update !== this.props.update) {
      this.setState({ update: this.props.update });
    }
  }

  buildColumn(columnName) {
    return {
      key: columnName,
      name: columnName,
      editable: true,
      resizable: true,
      width: 200
    };
  }

  buildRow() {
    return [];
  }

  handleEdit(event) {
    const { fromRow, toRow, updated } = event;
    const { field, onChange } = this.props;

    for (let i = fromRow; i <= toRow; i++) {
      field.value.rows[i] = { ...field.value.rows[i], ...updated };
    }

    onChange(field.value, field.id);
  }

  handleRangeSelection(event) {
    this.setState({ selection: {
      topLeft: event.topLeft,
      bottomRight: event.bottomRight
    }});
  }

  handleCellSelected(event) {
    this.setState({ selected: event });
  }

  handleCellDeSelected(event) {
    this.setState({ selected: {} });
  }

  handleColumnNameModalShow(action, idx) {
    this.setState({
      columnNameModal: {
        show: true,
        action,
        idx
      }
    });
  }

  handleColumnNameModalSubmit(columnName) {
    const { action, idx } = this.state.columnNameModal;

    if (action === 'insert') {
      this.handleColumnInsert(idx, columnName);
    } else if (action === 'rename') {
      this.handleColumnRename(idx, columnName);
    }

    this.handleColumnNameModalHide();
  }

  handleColumnNameModalHide() {
    this.setState({
      columnNameModal: {
        show: false,
        action: null,
        idx: null
      }
    });
  }

  handleColumnInsert(columnIdx, columnName) {
    const { field, onChange } = this.props;
    const columns = field.value.columns.slice();
    columns.splice(columnIdx, 0, this.buildColumn(columnName));
    field.value.columns = columns;
    onChange(field.value, field.id);
  }

  handleColumnRename(columnIdx, columnName) {
    const { field, onChange } = this.props;
    const columns = field.value.columns.slice();
    const rows = field.value.rows.slice();
    const oldColumnName = columns[columnIdx]['key'];
    const column = Object.assign({}, columns[columnIdx], {
      key: columnName,
      name: columnName
    });
    columns.splice(columnIdx, 1, column);
    field.value.columns = columns;

    for (let i = 0; i < rows.length; i++) {
      rows[i][columnName] = rows[i][oldColumnName];
      delete rows[i][oldColumnName];
    }

    onChange({ columns, rows }, field.id);
  }

  handleColumnResize(columnIdx, width) {
    const { field, onChange } = this.props;
    field.value.columns[columnIdx]['width'] = width;
    onChange(field.value, field.id);
  }

  handleColumnDelete(columnIdx) {
    const { field, onChange } = this.props;
    const columns = field.value.columns.slice();
    columns.splice(columnIdx, 1);
    field.value.columns = columns;
    onChange(field.value, field.id);
  }

  handleRowInsert(rowIdx) {
    const { field, onChange } = this.props;
    field.value.rows.splice(rowIdx, 0, this.buildRow());
    onChange(field.value, field.id);
  }

  handleRowDelete(rowIdx) {
    const { field, onChange } = this.props;
    field.value.rows.splice(rowIdx, 1);
    onChange(field.value, field.id);
  }

  handlePaste(event) {
    if (this.ref.current.grid.contains(document.activeElement)) {
      event.preventDefault();

      const { field, onChange } = this.props;
      const { selected } = this.state;

      const newRows = [];
      const pasteData = defaultParsePaste(event.clipboardData.getData('text/plain'));

      const colIdx = selected.idx;
      const rowIdx = selected.rowIdx;

      pasteData.forEach((row) => {
        const rowData = {};
        // Merge the values from pasting and the keys from the columns
        field.value.columns.slice(colIdx, colIdx + row.length).forEach((col, j) => {
          // Create the key-value pair for the row
          rowData[col.key] = row[j];
        });
        // Push the new row to the changes
        newRows.push(rowData);
      });

      for (let i = 0; i < newRows.length; i++) {
        if (rowIdx + i < field.value.rows.length) {
          field.value.rows[rowIdx + i] = { ...field.value.rows[rowIdx + i], ...newRows[i] };
        }
      }

      onChange(field.value, field.id);
    }
  }

  handleCopy(event) {
    if (this.ref.current.grid.contains(document.activeElement)) {
      event.preventDefault();

      const { columns } = this.props.field.value;
      const { selection } = this.state;

      // Loop through each row
      const text = range(selection.topLeft.rowIdx, selection.bottomRight.rowIdx + 1).map(
        // Loop through each column
        rowIdx => columns.slice(selection.topLeft.idx, selection.bottomRight.idx + 1).map(
          // Grab the row values and make a text string
          col => this.rowGetter(rowIdx)[col.key],
        ).join('\t'),
      ).join('\n');

      event.clipboardData.setData('text/plain', text);
    }
  }

  handleSchemaModalShow() {
    ResearchPlansFetcher.fetchTableSchemas().then((json) => {
      this.setState({
        schemaModal: {
          show: true,
          schemas: json['table_schemas']
        }
      });
    });
  }

  handleSchemasModalSubmit(schemaName) {
    ResearchPlansFetcher.createTableSchema(schemaName, this.props.field.value).then(() => {
      this.handleSchemaModalShow();
    });
  }

  handleSchemasModalHide() {
    this.setState({
      schemaModal: {
        show: false
      }
    });
  }

  handleSchemasModalUse(schema) {
    const { field, onChange } = this.props;

    onChange(schema.value, field.id);
    this.handleSchemasModalHide();
  }

  handleSchemasModalDelete(schema) {
    ResearchPlansFetcher.deleteTableSchema(schema.id).then(() => {
      this.handleSchemaModalShow();
    });
  }

  rowGetter(idx) {
    return this.props.field.value.rows[idx];
  }

  renderEdit() {
    const { field, onExport, tableIndex  } = this.props;
    const { rows, columns } = field.value;
    const { columnNameModal, schemaModal } = this.state;
    const editorPortalTarget = document.getElementsByClassName('react-grid-Viewport')[tableIndex];

    return (
      <div>
        <div className="research-plan-table-grid">
          <FixedReactDataGrid
            ref={this.ref}
            columns={columns}
            rowGetter={this.rowGetter.bind(this)}
            rowsCount={rows.length}
            minHeight={272}
            onGridRowsUpdated={event => this.handleEdit(event)}
            enableCellSelect={true}
            editorPortalTarget={editorPortalTarget}
            cellRangeSelection={{
              onComplete: this.handleRangeSelection.bind(this),
            }}
            onCellSelected={this.handleCellSelected.bind(this)}
            onCellDeSelected={this.handleCellDeSelected.bind(this)}
            onColumnResize={this.handleColumnResize.bind(this)}
            contextMenu={
              <ResearchPlanDetailsFieldTableContextMenu id={this.nextUniqueId()}
                onColumnInsertLeft={(event, { idx }) => this.handleColumnNameModalShow('insert', idx)}
                onColumnInsertRight={(event, { idx }) => this.handleColumnNameModalShow('insert', idx + 1)}
                onColumnRename={(event, { idx }) => this.handleColumnNameModalShow('rename', idx)}
                onColumnDelete={(event, { idx }) => this.handleColumnDelete(idx)}
                onRowInsertAbove={(event, { rowIdx }) => this.handleRowInsert(rowIdx)}
                onRowInsertBelow={(event, { rowIdx }) => this.handleRowInsert(rowIdx + 1)}
                onRowDelete={(event, { rowIdx }) => this.handleRowDelete(rowIdx)}
              />
            }
            RowsContainer={ContextMenuTrigger}
          />
        </div>
        <div className="research-plan-table-toolbar">
          <Row>
            <Col xs={3}>
              <Button bsSize="xsmall" onClick={this.handleSchemaModalShow.bind(this)}>
                Table schemas
              </Button>
            </Col>
            <Col xs={3} xsOffset={6}>
              <Button bsSize="xsmall" onClick={() => onExport(field)}>
                Export as Excel
              </Button>
            </Col>
          </Row>
        </div>
        <ResearchPlanDetailsFieldTableColumnNameModal
          modal={columnNameModal}
          onSubmit={this.handleColumnNameModalSubmit.bind(this)}
          onHide={this.handleColumnNameModalHide.bind(this)}
          columns={columns} />
        <ResearchPlanDetailsFieldTableSchemasModal
          modal={schemaModal}
          onSubmit={this.handleSchemasModalSubmit.bind(this)}
          onHide={this.handleSchemasModalHide.bind(this)}
          onUse={this.handleSchemasModalUse.bind(this)}
          onDelete={this.handleSchemasModalDelete.bind(this)} />
      </div>
    );
  }

  renderStatic() {
    const { field } = this.props;
    const { columns, rows } = field.value;

    const th = columns.map((column) => {
      return <th key={column.key}>{column.name}</th>;
    });

    const tr = rows.map((row, index) => {
      const td = columns.map((column) => {
        return <td key={column.key}>{row[column.key]}</td>;
      });
      return (
        <tr key={index}>
          {td}
        </tr>
      );
    });

    return (
      <table className="table table-bordered">
        <thead>
          <tr>
            {th}
          </tr>
        </thead>
        <tbody>
          {tr}
        </tbody>
      </table>
    );
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldTable.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  update: PropTypes.bool,
  edit: PropTypes.bool
};
