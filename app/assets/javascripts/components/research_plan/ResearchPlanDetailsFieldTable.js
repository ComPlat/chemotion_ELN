import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { range } from 'lodash';
import ReactDataGrid from 'react-data-grid';
import { Menu } from "react-data-grid-addons"

import ResearchPlanDetailsFieldTableContextMenu from './ResearchPlanDetailsFieldTableContextMenu'
import ResearchPlanDetailsFieldTableToolbar from './ResearchPlanDetailsFieldTableToolbar'
import ResearchPlanDetailsFieldTableColumnNameModal from './ResearchPlanDetailsFieldTableColumnNameModal'

const { ContextMenuTrigger } = Menu

const defaultParsePaste = str => (
  str.split(/\r\n|\n|\r/).map(row => row.split('\t'))
)

export default class ResearchPlanDetailsFieldTable extends Component {

  constructor(props) {
    super(props);
    this.state = {
      update: this.props.update,
      showModal: '',
      idx: null,
      selection: {}
    }

    document.addEventListener('copy', this.handleCopy.bind(this))
    document.addEventListener('paste', this.handlePaste.bind(this))

    this.handleCellSelected = this.handleCellSelected.bind(this)
    this.handleCellDeSelected = this.handleCellDeSelected.bind(this)
  }

   buildColumn(columnName) {
    return {
      key: columnName,
      name: columnName,
      editable: true,
      resizable: true,
      width: 200
    }
  }

  componentDidUpdate() {
    if (this.state.update != this.props.update) {
      this.setState({ update: this.props.update })
    }
  }

  buildRow() {
    return []
  }

  handleEdit(event) {
    const { fromRow, toRow, updated } = event
    const { field, onChange } = this.props

    for (let i = fromRow; i <= toRow; i++) {
      field.value.rows[i] = { ...field.value.rows[i], ...updated }
    }

    onChange(field.value, field.id)
  }

  handleRangeSelection(event) {
    this.setState({ selection: {
      topLeft: event.topLeft,
      bottomRight: event.bottomRight
    }})
  }

  handleCellSelected(event) {
    this.setState({ selected: event })
  }

  handleCellDeSelected(event) {
    this.setState({ selected: {} })
  }

  handleColumnNameModalOpen(showModal, idx) {
    this.setState({
      showModal: showModal,
      idx: idx
    })
  }

  handleColumnNameModalSubmit(columnName) {
    const { showModal, idx } = this.state

    if (columnName) {
      if (showModal == 'insert') {
        this.handleColumnInsert(idx, columnName)
      } else if (showModal == 'rename') {
        this.handleColumnRename(idx, columnName)
      }
    }

    this.setState({
      showModal: '',
      idx: null
    })
  }

  handleColumnInsert(columnIdx, columnName) {
    const { field, onChange } = this.props
    const columns = field.value.columns.slice()
    columns.splice(columnIdx, 0, this.buildColumn(columnName));
    field.value.columns = columns
    onChange(field.value, field.id)
  }

  handleColumnRename(columnIdx, columnName) {
    const { field, onChange } = this.props
    const columns = field.value.columns.slice()
    const rows = field.value.rows.slice()
    const oldColumnName = columns[columnIdx]['key']
    const column = Object.assign({}, columns[columnIdx], {
      key: columnName,
      name: columnName
    })
    columns.splice(columnIdx, 1, column);
    field.value.columns = columns

    for (let i = 0; i < rows.length; i++) {
      rows[i][columnName] = rows[i][oldColumnName]
      delete rows[i][oldColumnName]
    }

    onChange({ columns, rows }, field.id)
  }

  handleColumnResize(columnIdx, width) {
    const { field, onChange } = this.props
    field.value.columns[columnIdx]['width'] = width
    onChange(field.value, field.id)
  }

  handleColumnDelete(columnIdx) {
    const { field, onChange } = this.props
    const columns = field.value.columns.slice()
    columns.splice(columnIdx, 1)
    field.value.columns = columns
    onChange(field.value, field.id)
  }

  handleRowInsert(rowIdx) {
    const { field, onChange } = this.props
    field.value.rows.splice(rowIdx, 0, this.buildRow());
    onChange(field.value, field.id)
  }

  handleRowDelete(rowIdx) {
    const { field, onChange } = this.props
    field.value.rows.splice(rowIdx, 1)
    onChange(field.value, field.id)
  }

  handlePaste(event) {
    event.preventDefault();

    const { field, onChange } = this.props
    const { selected } = this.state;

    const newRows = [];
    const pasteData = defaultParsePaste(event.clipboardData.getData('text/plain'));

    const colIdx = selected.idx
    const rowIdx = selected.rowIdx

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

    onChange(field.value, field.id)
  }

  handleCopy(event) {
    event.preventDefault();

    const { columns } = this.props.field.value
    const { selection } = this.state;

    // Loop through each row
    const text = range(selection.topLeft.rowIdx, selection.bottomRight.rowIdx + 1).map(
      // Loop through each column
      rowIdx => columns.slice(selection.topLeft.idx, selection.bottomRight.idx + 1).map(
        // Grab the row values and make a text string
        col => this.rowGetter(rowIdx)[col.key],
      ).join('\t'),
    ).join('\n')

    event.clipboardData.setData('text/plain', text);
  }

  rowGetter(idx) {
    return this.props.field.value.rows[idx]
  }

  render() {
    const { field } = this.props
    const { rows, columns } = field.value
    const { showModal } = this.state
    const editorPortalTarget = document.getElementsByClassName('react-grid-Viewport')[0]

    return (
      <div>
        <ReactDataGrid
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
          toolbar={
            <ResearchPlanDetailsFieldTableToolbar

            />
          }
          contextMenu={
            <ResearchPlanDetailsFieldTableContextMenu
              onColumnInsertLeft={(event, { idx }) => this.handleColumnNameModalOpen('insert', idx)}
              onColumnInsertRight={(event, { idx }) => this.handleColumnNameModalOpen('insert', idx + 1)}
              onColumnRename={(event, { idx }) => this.handleColumnNameModalOpen('rename', idx)}
              onColumnDelete={(event, { idx }) => this.handleColumnDelete(idx)}
              onRowInsertAbove={(event, { rowIdx }) => this.handleRowInsert(rowIdx)}
              onRowInsertBelow={(event, { rowIdx }) => this.handleRowInsert(rowIdx + 1)}
              onRowDelete={(event, { rowIdx }) => this.handleRowDelete(rowIdx)}
            />
          }
          RowsContainer={ContextMenuTrigger}
        />
        <ResearchPlanDetailsFieldTableColumnNameModal
          showModal={showModal}
          columns={columns}
          onSubmit={this.handleColumnNameModalSubmit.bind(this)}/>
      </div>
    )
  }
}

ResearchPlanDetailsFieldTable.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  update: PropTypes.bool
}
