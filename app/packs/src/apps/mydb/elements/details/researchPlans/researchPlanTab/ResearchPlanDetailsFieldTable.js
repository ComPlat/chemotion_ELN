import Aviator from 'aviator';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import uniqueId from 'react-html-id';
import { AgGridReact } from 'ag-grid-react';
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import { Row, Col, Button } from 'react-bootstrap';

import CustomHeader from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/CustomHeader';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ResearchPlanDetailsFieldTableColumnNameModal from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableColumnNameModal';
import ResearchPlanDetailsFieldTableMeasurementExportModal from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableMeasurementExportModal';
import ResearchPlanDetailsFieldTableSchemasModal from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableSchemasModal';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher'


// regexp to parse tap separated paste from the clipboard
const defaultParsePaste = str => (
  str.split(/\r\n|\n|\r/).map(row => row.split('\t'))
);

export default class ResearchPlanDetailsFieldTable extends Component {

  constructor(props) {
    super(props);
    this.state = {
      update: this.props.update,
      currentlyCollapsedInEditMode: this.props?.field?.value?.startCollapsed ?? false,
      currentlyCollapsedInViewMode: this.props?.field?.value?.startCollapsed ?? false,
      columnNameModal: {
        show: false,
        colId: null
      },
      schemaModal: {
        show: false
      },
      measurementExportModal: {
        show: false
      },
      selection: {},
      gridApi: {},
      columnApi: {},
      columnClicked: null,
      rowClicked: null,
      isDisable: true
    };

    uniqueId.enableUniqueIds(this)

    this.ref = React.createRef();
  }

  componentDidUpdate() {
    if (this.state.update !== this.props.update) {
      this.setState({ update: this.props.update });
    }
  }

  buildColumn(columnName) {
    return {
      cellEditor: 'agTextCellEditor',
      colId: columnName,
      editable: true,
      field: columnName,
      headerName: columnName,
      key: columnName,
      name: columnName,
      resizable: true,
      width: 200,
    };
  }

  buildRow() {
    return [];
  }

  handleColumnNameModalShow(action, colId) {
    this.setState({
      columnNameModal: {
        show: true,
        action,
        colId
      }
    });
  }

  handleColumnNameModalSubmit(columnName) {
    const { action, colId } = this.state.columnNameModal;

    if (action === 'insert') {
      this.handleColumnInsert(columnName);
    } else if (action === 'rename') {
      this.handleColumnRename(colId, columnName);
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

  handleColumnInsert(columnName) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    let columnDefs = gridApi.getColumnDefs();
    columnDefs.push(this.buildColumn(columnName));
    gridApi.setColumnDefs(columnDefs);
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
  }

  handleColumnRename(colId, columnName) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    let columnDefs = gridApi.getColumnDefs();
    let columnChange = columnDefs.find(o => o.colId === colId);
    columnChange.headerName = columnName;
    gridApi.setColumnDefs(columnDefs);
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
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

  _handleMeasurementExportModalShow() {
    this.setState({
      measurementExportModal: {
        show: true
      }
    });
  }

  _handleMeasurementExportModalHide() {
    this.setState({
      measurementExportModal: {
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

  cellValueChanged = () => {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.rows = rowData
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
  }

  onGridReady = (params) => {
    this.setState({
      gridApi: params.api,
      columnApi: params.columnApi
    });

    const { field } = this.props;
    params.columnApi.setColumnState(field.value.columnStates);
  }

  onSaveGridColumnState(params) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    let sortedRows = []
    gridApi.forEachNodeAfterFilterAndSort(row => sortedRows.push(row.data))
    field.value.rows = sortedRows

    onChange(field.value, field.id);
  }

  onSaveGridRow() {
    const { field, onChange } = this.props;
    const { gridApi } = this.state

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.rows = rowData

    onChange(field.value, field.id);
  }

  addNewRow() {
    const { field, onChange } = this.props;
    const { gridApi } = this.state

    gridApi.applyTransaction({
      add: [{}],
    });

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.columns = gridApi.getColumnDefs();
    field.value.rows = rowData

    onChange(field.value, field.id);
  }

  removeThisRow() {
    const { field, onChange } = this.props;
    const { gridApi, rowClicked } = this.state
    let rowData = [];
    gridApi.forEachNodeAfterFilterAndSort(node => {
      rowData.push(node.data);
    });
    gridApi.applyTransaction({ remove: [rowData[rowClicked]] });

    rowData = rowData.filter(function (value, index, arr) {
      return index !== rowClicked;
    });
    field.value.rows = rowData

    onChange(field.value, field.id);
  }

  removeThisColumn() {
    const { field, onChange } = this.props;
    const { gridApi, columnApi, columnClicked } = this.state
    if (columnClicked) {
      let columnDefs = gridApi.getColumnDefs();
      columnDefs = columnDefs.filter(function (value, index, arr) {
        return value.colId !== columnClicked;
      });

      gridApi.setColumnDefs(columnDefs);
      field.value.columns = gridApi.getColumnDefs();
      field.value.columnStates = columnApi.getColumnState();

      onChange(field.value, field.id);
    }
  }

  onCellContextMenu(params) {
    this.setState({ columnClicked: params.column.colId, rowClicked: params.rowIndex });
  }

  handleRenameClick() {
    const { columnClicked } = this.state;
    if (columnClicked) {
      this.handleColumnNameModalShow('rename', columnClicked);
    }
  }

  handlePaste(event) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi, columnClicked, rowClicked } = this.state;
    onChange(field.value, field.id);

    navigator.clipboard.readText()
      .then(data => {
        let lines = data.split(/\n/);
        let cellData = [];
        lines.forEach(element => {
          cellData.push(element.split('\t'));
        });


        let columns = columnApi.getAllColumns();
        let rowData = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          rowData.push(node.data);
        });

        let rowIndex = 0;
        for (let i = 0; i < rowData.length; i++) {
          let row = [];
          let startUpdate = false;
          if (i >= rowClicked) {
            let columnIndex = 0;
            for (let j = 0; j < columns.length; j++) {
              const element = columns[j];
              if (startUpdate || element.colId === columnClicked) {
                startUpdate = true;
                rowData[i][element.colId] = cellData[rowIndex][columnIndex];
                columnIndex++;
              }
            }
            rowIndex++;
          }
        }

        gridApi.applyTransaction({
          update: rowData,
        });

        field.value.rows = rowData
        onChange(field.value, field.id);
      })
      .catch(err => {
        console.error('Failed to read clipboard contents: ', err);
      });
  }

  handleInsertColumnClick() {
    const { columnClicked } = this.state;
    if (columnClicked) {
      this.handleColumnNameModalShow('insert', columnClicked);
    }
  }

  onCellMouseOver() {
    this.setState({ isDisable: false });
  }

  onCellMouseOut() {
    this.setState({ isDisable: true });
  }

  toggleTemporaryCollapse() {
    if (this.props.edit) {
      this.setState(
        { currentlyCollapsedInEditMode: !this.state.currentlyCollapsedInEditMode }
      )
    } else {
      this.setState(
        { currentlyCollapsedInViewMode: !this.state.currentlyCollapsedInViewMode }
      )
    }
  }

  temporaryCollapseToggleButton() {
    const collapsed = this.props.edit
      ? this.state.currentlyCollapsedInEditMode
      : this.state.currentlyCollapsedInViewMode
    const collapseToggleIconClass = collapsed ? 'fa-expand' : 'fa-compress';
    const collapseToggleTitle = collapsed ? 'expand table' : 'collapse table';
    return (
      <button
        className="button-right btn btn-xs btn-info"
        type="button"
        title={collapseToggleTitle}
        onClick={this.toggleTemporaryCollapse.bind(this)}
      >
        <i className={`fa ${collapseToggleIconClass}`}></i>
      </button>
    );
  }

  permanentCollapseToggleButton() {
    const collapsed = this.props?.field?.value?.startCollapsed ?? false
    const togglePermanentCollapse = () => {
      const { field, onChange } = this.props;
      field.value.startCollapsed = !collapsed

      onChange(field.value, field.id);
      this.setState({ currentlyCollapsedInViewMode: !collapsed })
    }

    return (
      <button
        className="btn btn-sm btn-info"
        style={{ "margin-bottom": "5px" }}
        onClick={togglePermanentCollapse.bind(this)}
      >
        Table is <strong>{collapsed ? 'collapsed' : 'expanded'}</strong> in view mode
      </button>
    )
  }

  renderEdit() {
    const { field, onExport } = this.props;
    const { rows, columns } = field.value;
    const { columnNameModal, schemaModal, measurementExportModal, isDisable } = this.state;
    let contextMenuId = this.nextUniqueId();
    const defaultColDef = {
      resizable: true,
      rowDrag: true,
      sortable: true,
      editable: true,
      cellClass: 'cell-figure',
      headerComponentFramework: CustomHeader,
      headerComponentParams: {
        handleColumnNameModalShow: this.handleColumnNameModalShow.bind(this)
      }
    };

    const gridWrapperClassName = ['research-plan-table-grid']
    if (this.state.currentlyCollapsedInEditMode) {
      gridWrapperClassName.push('grid-with-collapsed-rows')
    }

    return (
      <div>
        <div>
          {this.permanentCollapseToggleButton()}
          {this.temporaryCollapseToggleButton()}
        </div>
        <div className={gridWrapperClassName.join(' ')}>
          <div id='myGrid' className='ag-theme-alpine'>
            <ContextMenuTrigger id={contextMenuId} disable={isDisable}>
              <AgGridReact
                animateRows={true}
                columnDefs={columns}
                defaultColDef={defaultColDef}
                domLayout='autoHeight'
                enableMultiRowDragging={true}
                onCellContextMenu={this.onCellContextMenu.bind(this)}
                onCellEditingStopped={this.cellValueChanged}
                onCellMouseOut={this.onCellMouseOut.bind(this)}
                onCellMouseOver={this.onCellMouseOver.bind(this)}
                onColumnMoved={this.onSaveGridColumnState.bind(this)}
                onColumnResized={this.onSaveGridColumnState.bind(this)}
                onGridReady={this.onGridReady}
                onRowDragEnd={this.onSaveGridRow.bind(this)}
                onSortChanged={this.onSaveGridColumnState.bind(this)}
                rowData={rows}
                rowDragManaged={true}
                rowHeight='37'
                rowSelection='multiple'
                singleClickEdit={true}
                stopEditingWhenGridLosesFocus={true}
                suppressDragLeaveHidesColumns={true}
              />
            </ContextMenuTrigger>
            <ContextMenu id={contextMenuId}>
              <MenuItem onClick={this.handlePaste.bind(this)}>
                Paste
              </MenuItem>
              <MenuItem onClick={this.handleRenameClick.bind(this)}>
                Rename column
              </MenuItem>
              <MenuItem divider />
              <MenuItem onClick={this.handleInsertColumnClick.bind(this)}>
                Add new column
              </MenuItem>
              <MenuItem onClick={this.addNewRow.bind(this)}>
                Add new row
              </MenuItem>
              <MenuItem divider />
              <MenuItem onClick={this.removeThisColumn.bind(this)}>
                Remove this column
              </MenuItem>
              <MenuItem onClick={this.removeThisRow.bind(this)}>
                Remove this row
              </MenuItem>
            </ContextMenu>
          </div>
        </div>

        <div className='research-plan-table-toolbar'>
          <Row>
            <Col xs={4}>
              <Button bsSize='xsmall' onClick={this.handleSchemaModalShow.bind(this)}>
                Table schemas
              </Button>
            </Col>
            <Col xs={4}>
              <Button bsSize='xsmall' onClick={this._handleMeasurementExportModalShow.bind(this)}>
                Export Measurements
              </Button>
            </Col>
            <Col xs={4}>
              <Button bsSize='xsmall' onClick={() => onExport(field)}>
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
        <ResearchPlanDetailsFieldTableMeasurementExportModal
          show={measurementExportModal.show}
          onHide={this._handleMeasurementExportModalHide.bind(this)}
          rows={rows}
          columns={columns} />
      </div>
    );
  }

  renderStatic() {
    const { field } = this.props;
    const { columns, rows } = field.value;

    const lastColumn = columns.length - 1;
    const th = columns.map((column, index) => {

      return (
        <th key={column.colId}>
          {column.headerName}
          {index == lastColumn ? this.temporaryCollapseToggleButton() : ''}
        </th>
      );
    });

    const tr = rows.map((row, index) => {
      const td = columns.map((column) => {
        let cellContent = row[column.colId];
        if (column.headerName == 'Sample') {
          let cellContentIsShortLabel = column.headerName == 'Sample' && (cellContent || '').length > 3;
          if (cellContentIsShortLabel) {
            let shortLabel = cellContent;
            cellContent = <a
              onClick={(e) => { e.preventDefault(); this.openSampleByShortLabel(shortLabel) }}
            >
              {shortLabel}
            </a>
          }
        }
        else if (column.headerName == 'Reaction') {
          let cellContentIsShortLabel = column.headerName == 'Reaction' && (cellContent || '').length > 3;
          if (cellContentIsShortLabel) {
            let shortLabel = cellContent;
            cellContent = <a
              onClick={(e) => { e.preventDefault(); this.openReactionByShortLabel(shortLabel) }}
            >
              {shortLabel}
            </a>
          }
        }
        return <td style={{ 'height': '37px' }} key={column.colId}>{cellContent}</td>;
      });
      return (
        <tr key={index}>
          {td}
        </tr>
      );
    });
    const collapsed = this.state.currentlyCollapsedInViewMode

    return (
      <table className='table table-bordered'>
        <thead>
          <tr>
            {th}
          </tr>
        </thead>
        <tbody className={collapsed ? 'hidden' : ''}>
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

  openSampleByShortLabel(shortLabel) {
    console.debug('opening Sample by short label', shortLabel);
    SamplesFetcher.findByShortLabel(shortLabel).then((result) => {
      console.debug('got Result', result);
      if (result.sample_id && result.collection_id) {
        Aviator.navigate(`/collection/${result.collection_id}/sample/${result.sample_id}`, { silent: true });
        ElementActions.fetchSampleById(result.sample_id);
      } else {
        console.debug('No valid data returned for short label', shortLabel, result);
      }
    });
  }

  openReactionByShortLabel(shortLabel) {
    console.debug('opening reaction by short label', shortLabel);
    ReactionsFetcher.findByShortLabel(shortLabel).then((result) => {
      console.debug('got Result', result);
      if (result.reaction_id && result.collection_id) {
        Aviator.navigate(`/collection/${result.collection_id}/reaction/${result.reaction_id}`, { silent: true });
        ElementActions.fetchReactionById(result.reaction_id);
      } else {
        console.debug('No valid data returned for short label', shortLabel, result);
      }
    });
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
