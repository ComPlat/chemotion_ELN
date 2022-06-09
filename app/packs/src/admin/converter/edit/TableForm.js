import React, { Component } from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import TableColumn from './TableColumn';

class TableForm extends Component {

  constructor(props) {
    super(props)
  }

  render() {
    const { table, updateTable, addOperation, updateOperation, removeOperation } = this.props

    return (
      <div>
        <div>
        <h4><i><u><b>Table Columns</b></u></i></h4>
        </div>
        <Row>
          <Col sm={6} md={6} lg={6}>
            <TableColumn table={table} label="x-values"
                         columnKey="xColumn" operationsKey="xOperations" updateTable={updateTable}
                         addOperation={addOperation} updateOperation={updateOperation} removeOperation={removeOperation}/>
          </Col>
          <Col sm={6} md={6} lg={6}>
            <TableColumn table={table} label="y-values"
                         columnKey="yColumn" operationsKey="yOperations" updateTable={updateTable}
                         addOperation={addOperation} updateOperation={updateOperation} removeOperation={removeOperation}/>
          </Col>
        </Row>
        <small className="text-muted">The data you pick will determine which table columns are going to converted.</small>
      </div>
    )
  }
}

export default TableForm;
