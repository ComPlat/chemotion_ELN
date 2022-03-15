/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import OperatorSelect from '../common/OperatorSelect';
import { ButtonTooltip } from '../../../admin/generic/Utils';

class TableColumn extends Component {
  render() {
    const {
      table, label, columnKey, operationsKey, updateTable,
      addOperation, updateOperation, removeOperation
    } = this.props;

    const getValue = (column, key) => {
      if (column !== undefined && typeof column[key] == 'number' && !isNaN(column[key])) {
        return column[key];
      }
      return null;
    };

    return (
      <div>
        <label className="mb-2">{label}</label>
        <Row>
          <Col sm={6} md={6} lg={6}>
            <input
              type="number"
              className="form-control form-control-sm"
              onChange={event => updateTable(columnKey, {
                tableIndex: parseInt(event.target.value),
                columnIndex: getValue(table[columnKey], 'columnIndex')
              })}
              value={getValue(table[columnKey], 'tableIndex') || ''}
            />
            <small>Table Index</small>
          </Col>
          <Col sm={6} md={6} lg={6}>
            <input
              type="number"
              className="form-control form-control-sm"
              onChange={event => updateTable(columnKey, {
                tableIndex: getValue(table[columnKey], 'tableIndex'),
                columnIndex: parseInt(event.target.value)
              })}
              value={getValue(table[columnKey], 'columnIndex') || ''}
            />
            <small>Column Index</small>
          </Col>
        </Row>
        {
          table[operationsKey] && table[operationsKey].map((operation, index) => (
            <Row key={index}>
              <Col sm={2} md={2} lg={2}>
                <OperatorSelect
                  value={operation.operator}
                  onChange={value => updateOperation(operationsKey, index, 'operator', value)}
                />
              </Col>
              {
                operation.type == 'column' &&
                <Col sm={8} md={8} lg={8}>
                  <Row>
                    <Col sm={6} md={6} lg={6}>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        onChange={event => updateOperation(operationsKey, index, 'column', {
                          tableIndex: parseInt(event.target.value),
                          columnIndex: getValue(operation.column, 'columnIndex')
                        })}
                        value={getValue(operation.column, 'tableIndex') || ''}
                      />
                      <small>Table Index</small>
                    </Col>
                    <Col sm={6} md={6} lg={6}>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        onChange={event => updateOperation(operationsKey, index, 'column', {
                          tableIndex: getValue(operation.column, 'tableIndex'),
                          columnIndex: parseInt(event.target.value)
                        })}
                        value={getValue(operation.column, 'columnIndex') || ''}
                      />
                      <small>Column Index</small>
                    </Col>
                  </Row>
                </Col>
              }
              {
                operation.type == 'value' &&
                <Col sm={8} md={8} lg={8}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={operation.value || ''}
                    onChange={event => updateOperation(operationsKey, index, 'value', event.target.value)}
                  />
                  <small>Scalar value</small>
                </Col>
              }
              <Col sm={2} md={2} lg={2}>
                <span className="button-right" >
                  <ButtonTooltip tip="Remove" size="small" fnClick={() => removeOperation(operationsKey, index)} place="left" fa="fa-trash-o" />&nbsp;
                </span>
              </Col>
            </Row>
          ))
        }
        <Row style={{ marginTop: '10px' }}>
          <Col sm={12} md={12} lg={12}>
            <Button bsStyle="primary" bsSize="small" onClick={() => addOperation(operationsKey, 'column')}>
              Add column operation&nbsp;<i className="fa fa-plus" aria-hidden="true" />
            </Button>&nbsp;&nbsp;
            <Button bsStyle="primary" bsSize="small" onClick={() => addOperation(operationsKey, 'value')}>
              Add scalar operation&nbsp;<i className="fa fa-plus" aria-hidden="true" />
            </Button>&nbsp;&nbsp;
          </Col>
        </Row>
      </div>
    );
  }
}

export default TableColumn;
