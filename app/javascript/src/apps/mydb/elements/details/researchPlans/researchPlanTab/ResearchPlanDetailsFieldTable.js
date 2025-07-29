import Aviator from 'aviator';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import uniqueId from 'react-html-id';
import { AgGridReact } from 'ag-grid-react';
import { ContextMenu, ContextMenuTrigger } from "react-contextmenu";
import { Button, Row, Col, Dropdown } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import CustomHeader from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/CustomHeader';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ResearchPlanDetailsFieldTableColumnNameModal from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableColumnNameModal';
import ResearchPlanDetailsFieldTableMeasurementExportModal from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableMeasurementExportModal';
import ResearchPlanDetailsFieldTableSchemasModal from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableSchemasModal';
import { COLUMN_ID_SHORT_LABEL_SAMPLE, COLUMN_ID_SHORT_LABEL_REACTION } from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableUtils';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';


export default class ResearchPlanDetailsFieldTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
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
      columnClicked: null,
      rowClicked: null,
      isDisable: true,
    };

    uniqueId.enableUniqueIds(this)

    this.ref = React.createRef();
    this.renderShortLabel = this.renderShortLabel.bind(this);
  }

  componentWillUnmount() {
    // Clean up any pending clipboard operations
    if (this.clipboardTimeout) {
      clearTimeout(this.clipboardTimeout);
    }
  }

  buildColumn(columnName) {
    const id = uuidv4();
    // TODO implement a more robust way to set the column id and select the renderer not based on the column name
    const colId = (columnName === COLUMN_ID_SHORT_LABEL_SAMPLE || columnName === COLUMN_ID_SHORT_LABEL_REACTION)
      ? columnName
      : id;

    const column = {
      cellEditor: 'agTextCellEditor',
      colId,
      editable: true,
      field: colId, // Use colId as field to ensure data consistency
      headerName: columnName,
      key: id,
      name: columnName,
      resizable: true,
      width: 200,
    };

    // If it's a special column, add the cell renderer
    if (columnName === COLUMN_ID_SHORT_LABEL_SAMPLE || columnName === COLUMN_ID_SHORT_LABEL_REACTION) {
      column.cellRenderer = this.renderShortLabel;
    }

    return column;
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

  handleColumnNameModalSubmit(columnName, newColId = null) {
    const { action, colId } = this.state.columnNameModal;

    if (action === 'insert') {
      this.handleColumnInsert(columnName);
    } else if (action === 'rename') {
      this.handleColumnRename(colId, columnName, newColId);
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
    const { gridApi } = this.state;

    if (!columnName || columnName.trim() === '') {
      console.warn('Cannot insert column with empty name');
      return;
    }

    if (!gridApi || !gridApi.getColumnDefs) {
      console.error('Grid API not available for column insert');
      return;
    }

    try {
      let columnDefs = gridApi.getColumnDefs();
      const newColumn = this.buildColumn(columnName.trim());
      columnDefs.push(newColumn);
      
      // If inserting a special column, clear any existing data for that colId
      if (columnName === COLUMN_ID_SHORT_LABEL_SAMPLE || columnName === COLUMN_ID_SHORT_LABEL_REACTION) {
        let rowData = [];
        gridApi.forEachNode(node => rowData.push(node.data));
        
        // Clear existing data for this special column ID to ensure fresh start
        rowData.forEach(row => {
          if (row[columnName] !== undefined) {
            delete row[columnName];
          }
        });
        
        gridApi.setGridOption('columnDefs', columnDefs);
        gridApi.applyTransaction({ update: rowData });
      } else {
        gridApi.setGridOption('columnDefs', columnDefs);
      }
      
      field.value.columns = gridApi.getColumnDefs();
      field.value.columnStates = gridApi.getColumnState();

      onChange(field.value, field.id);
    } catch (error) {
      console.error('Error inserting column:', error);
    }
  }

  handleColumnRename(colId, columnName) {
    const { field, onChange } = this.props;
    const { gridApi } = this.state

    let columnDefs = gridApi.getColumnDefs();
    let columnChange = columnDefs.find(o => o.colId === colId);
    
    // Store the old colId and field to check if it was a special column
    const oldColId = columnChange.colId;
    const oldField = columnChange.field;
    const wasSpecialColumn = (oldColId === COLUMN_ID_SHORT_LABEL_SAMPLE || oldColId === COLUMN_ID_SHORT_LABEL_REACTION);
    const isBecomingSpecialColumn = (columnName === COLUMN_ID_SHORT_LABEL_SAMPLE || columnName === COLUMN_ID_SHORT_LABEL_REACTION);
    
    // Get current row data before making any changes
    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    
    if (isBecomingSpecialColumn) {
      // Check if this special column ID is already taken by another column
      const existingSpecialColumn = columnDefs.find(col => 
        col.colId === columnName && col.colId !== colId
      );
      
      if (!existingSpecialColumn) {
        // Move data from old field to new special colId
        rowData.forEach(row => {
          if (row[oldField] !== undefined) {
            row[columnName] = row[oldField];
            delete row[oldField];
          }
        });
        
        // Update column definition for special column
        columnChange.colId = columnName;
        columnChange.field = columnName;
        columnChange.headerName = columnName;
        columnChange.cellRenderer = this.renderShortLabel;
        
        // Update grid with new column defs and data
        gridApi.setGridOption('columnDefs', columnDefs);
        gridApi.applyTransaction({ update: rowData });
      } else {
        // Just update header name if special column already exists
        columnChange.headerName = columnName;
        gridApi.setGridOption('columnDefs', columnDefs);
      }
    } else if (wasSpecialColumn) {
      // Renaming away from a special column to a regular column
      // Generate new UUID for non-special column
      const newId = uuidv4();
      
      // Move data from old special colId to new regular field
      rowData.forEach(row => {
        if (row[oldField] !== undefined) {
          row[newId] = row[oldField];
          delete row[oldField];
        }
      });
      
      // Update column definition for regular column
      delete columnChange.cellRenderer;
      columnChange.colId = newId;
      columnChange.field = newId;
      columnChange.headerName = columnName;
      
      // Update grid with new column defs and data
      gridApi.setGridOption('columnDefs', columnDefs);
      gridApi.applyTransaction({ update: rowData });
    } else {
      // Regular column to regular column - just update the header name
      // Keep the same colId and field, only change the display name
      columnChange.headerName = columnName;
      
      // Update grid with new column defs (no data migration needed)
      gridApi.setGridOption('columnDefs', columnDefs);
    }
    
    // Save the updated state
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = gridApi.getColumnState();
    
    // Get final row data after all updates
    let finalRowData = [];
    gridApi.forEachNode(node => finalRowData.push(node.data));
    field.value.rows = finalRowData;

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

  handleSchemaModalShow = () => {
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

  _handleMeasurementExportModalShow = () => {
    this.setState({
      measurementExportModal: {
        show: true
      }
    });
  };

  _handleMeasurementExportModalHide = () => {
    this.setState({
      measurementExportModal: {
        show: false
      }
    });
  };

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
    const { gridApi } = this.state

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.rows = rowData
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = gridApi.getColumnState();

    onChange(field.value, field.id);
  }

  onGridReady = (params) => {
    this.setState({
      gridApi: params.api,
    });

    const { field } = this.props;
    if (!field.value.columnStates) return;
    params.api.applyColumnState(field.value.columnStates);
  }

  onSaveGridColumnState(params) {
    const { field, onChange } = this.props;
    const { gridApi } = this.state

    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = gridApi.getColumnState();

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

  addNewRow = () => {
    const { field, onChange } = this.props;
    const { gridApi } = this.state;

    gridApi.applyTransaction({
      add: [{}],
    });

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.columns = gridApi.getColumnDefs();
    field.value.rows = rowData;

    onChange(field.value, field.id);
  };

  removeThisRow = () => {
    const { field, onChange } = this.props;
    const { gridApi, rowClicked } = this.state;
    let rowData = [];
    gridApi.forEachNodeAfterFilterAndSort(node => {
      rowData.push(node.data);
    });
    gridApi.applyTransaction({ remove: [rowData[rowClicked]] });

    rowData = rowData.filter(function (value, index, arr) {
      return index !== rowClicked;
    });
    field.value.rows = rowData;

    onChange(field.value, field.id);
  };

  removeThisColumn = () => {
    const { field, onChange } = this.props;
    const { gridApi, columnClicked } = this.state;
    if (columnClicked) {
      // Get row data before removing column to clean up orphaned data
      let rowData = [];
      gridApi.forEachNode((node) => rowData.push(node.data));
      
      // Remove the column data from all rows
      rowData.forEach((row) => {
        if (row[columnClicked] !== undefined) {
          delete row[columnClicked];
        }
      });
      
      // Remove column definition
      let columnDefs = gridApi.getColumnDefs();
      columnDefs = columnDefs.filter((value) => value.colId !== columnClicked);

      // Update grid with new column definitions and cleaned data
      gridApi.setGridOption('columnDefs', columnDefs);
      gridApi.applyTransaction({ update: rowData });
      
      field.value.columns = gridApi.getColumnDefs();
      field.value.columnStates = gridApi.getColumnState();
      field.value.rows = rowData;

      onChange(field.value, field.id);
    }
  };

  onCellContextMenu(params) {
    this.setState({ columnClicked: params.column.colId, rowClicked: params.rowIndex });
  }

  handleRenameClick = () => {
    const { columnClicked } = this.state;
    if (columnClicked) {
      this.handleColumnNameModalShow('rename', columnClicked);
    }
  };

  handlePaste = (event) => {
    const { field, onChange } = this.props;
    const { gridApi, columnClicked, rowClicked } = this.state;

    if (!navigator.clipboard) {
      console.warn('Clipboard API not available');
      return;
    }

    navigator.clipboard.readText()
      .then(data => {
        let lines = data.split(/\n/);
        let cellData = [];
        lines.forEach(element => {
          cellData.push(element.split('\t'));
        });

        let columns = gridApi.getAllGridColumns();
        let rowData = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          rowData.push(node.data);
        });

        let rowIndex = 0;
        for (let i = 0; i < rowData.length; i++) {
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

  handleInsertColumnClick = () => {
    const { columnClicked } = this.state;
    if (columnClicked) {
      this.handleColumnNameModalShow('insert', columnClicked);
    }
  };

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
      <Button
        variant="info"
        size="xxsm"
        title={collapseToggleTitle}
        onClick={this.toggleTemporaryCollapse.bind(this)}
      >
        <i className={`fa ${collapseToggleIconClass}`} />
      </Button>
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
      <Button
        variant="info"
        size="xxsm"
        onClick={togglePermanentCollapse.bind(this)}
      >
        Table is <strong>{collapsed ? 'collapsed' : 'expanded'}</strong> in view mode
      </Button>
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
      headerComponent: CustomHeader,
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
        <div className="d-flex justify-content-between">
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
                rowDragMultiRow={true}
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
                rowHeight={37}
                rowSelection='multiple'
                singleClickEdit={true}
                stopEditingWhenCellsLoseFocus={true}
                suppressDragLeaveHidesColumns={true}
              />
            </ContextMenuTrigger>
            <ContextMenu id={contextMenuId}>
              <Dropdown.Menu show>
                <Dropdown.Item onClick={this.handlePaste}>Paste</Dropdown.Item>
                <Dropdown.Item onClick={this.handleRenameClick}>Rename column</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={this.handleInsertColumnClick}>Add new column</Dropdown.Item>
                <Dropdown.Item onClick={this.addNewRow}>Add new row</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={this.removeThisColumn}>Remove this column</Dropdown.Item>
                <Dropdown.Item onClick={this.removeThisRow}>Remove this row</Dropdown.Item>
              </Dropdown.Menu>
            </ContextMenu>
          </div>
        </div>

        <div>
          <Row className="py-2">
            <Col xs={4}>
              <Button
                size="xsm"
                className="py-2 px-4 w-100"
                variant="light"
                onClick={this.handleSchemaModalShow}>
                Table schemas
              </Button>
            </Col>
            <Col xs={4}>
              <Button
                size="xsm"
                className="py-2 px-4 w-100"
                variant="light"
                onClick={this._handleMeasurementExportModalShow}>
                Export Measurements
              </Button>
            </Col>
            <Col xs={4}>
              <Button
                size="xsm"
                className="py-2 px-4 w-100"
                variant="light"
                onClick={() => onExport(field)}
              >
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
          onHide={this._handleMeasurementExportModalHide}
          rows={rows}
          columns={columns} />
      </div>
    );
  }

  openSampleByShortLabel(shortLabel) {
    SamplesFetcher.findByShortLabel(shortLabel)
      .then((result) => {
        if (result.sample_id && result.collection_id) {
          Aviator.navigate(`/collection/${result.collection_id}/sample/${result.sample_id}`, { silent: true });
          ElementActions.fetchSampleById(result.sample_id);
        } else {
          console.debug('No valid data returned for short label', shortLabel, result);
        }
      })
      .catch((error) => {
        console.error('Error fetching sample by short label:', error);
      });
  }

  openReactionByShortLabel(shortLabel) {
    ReactionsFetcher.findByShortLabel(shortLabel)
      .then((result) => {
        if (result.reaction_id && result.collection_id) {
          Aviator.navigate(`/collection/${result.collection_id}/reaction/${result.reaction_id}`, { silent: true });
          ElementActions.fetchReactionById(result.reaction_id);
        } else {
          console.debug('No valid data returned for short label', shortLabel, result);
        }
      })
      .catch((error) => {
        console.error('Error fetching reaction by short label:', error);
      });
  }

  renderShortLabel(params) {
    const { data, colDef } = params;
    if (!data) {
      return params.value || '';
    }

    const cellValue = data[colDef.colId];
    if (!cellValue || cellValue === '') {
      return params.value || '';
    }

    if (colDef.colId === COLUMN_ID_SHORT_LABEL_SAMPLE) {
      return React.createElement('a', {
        className: 'link',
        onClick: (e) => {
          e.preventDefault();
          this.openSampleByShortLabel(cellValue);
        },
        style: { cursor: 'pointer' }
      }, cellValue);
    }

    if (colDef.colId === COLUMN_ID_SHORT_LABEL_REACTION) {
      return React.createElement('a', {
        className: 'link',
        onClick: (e) => {
          e.preventDefault();
          this.openReactionByShortLabel(cellValue);
        },
        style: { cursor: 'pointer' }
      }, cellValue);
    }

    return params.value || '';
  }

  renderStatic() {
    const { field } = this.props;
    const { columns, rows } = field.value;
    const staticColumns = cloneDeep(columns);

    staticColumns.forEach((item) => {
      if (item.colId === COLUMN_ID_SHORT_LABEL_SAMPLE || item.colId === COLUMN_ID_SHORT_LABEL_REACTION) {
        item.cellRenderer = this.renderShortLabel;
      }
      item.editable = false;
      item.resizable = false;
      item.sortable = false;
      item.rowDrag = false;
      item.cellClass = 'border-end';
      return item;
    });

    const defaultColDef = {
      flex: 1,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      autoHeight: true,
      suppressMovable: true,
      cellClass: ["border-end"],
      headerClass: ["border-end"],
    };

    const gridWrapperClassName = ['research-plan-table-grid'];
    if (this.state.currentlyCollapsedInViewMode) {
      gridWrapperClassName.push('grid-with-collapsed-rows')
    }

    return (
      <div className={gridWrapperClassName.join(' ')}>
        <div className="d-flex justify-content-end">
          {this.temporaryCollapseToggleButton()}
        </div>
        <div className="ag-theme-alpine">
          <AgGridReact
            columnDefs={staticColumns}
            defaultColDef={defaultColDef}
            domLayout='autoHeight'
            autoSizeStrategy={{ type: 'fitGridWidth' }}
            rowData={rows}
            rowHeight={37}
          />
        </div>
      </div>
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
  edit: PropTypes.bool,
  onExport: PropTypes.func
};
