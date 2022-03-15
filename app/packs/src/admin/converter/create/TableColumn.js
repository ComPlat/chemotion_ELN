/* eslint-disable react/prop-types */
import React from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import ColumnSelect from '../common/ColumnSelect';
import OperatorSelect from '../common/OperatorSelect';
import { ButtonTooltip } from '../../../admin/generic/Utils';


const TableColumn = (props) => {
  const {
    table, label, columnKey, operationsKey, columnList, updateTable,
    addOperation, updateOperation, removeOperation
  } = props;

  return (
    <React.Fragment>
      <div className="form-group">
        <label>{label}</label>
        <ColumnSelect column={table[columnKey]}
                      columnList={columnList}
                      onChange={column => updateTable(columnKey, column)} />
      </div>
      {
        table[operationsKey] && table[operationsKey].map((operation, index) => (
          <Row key={index} style={{ marginTop: '10px' }}>
            <Col sm={2} md={2} lg={2}>
              <OperatorSelect value={operation.operator}
                              onChange={value => updateOperation(operationsKey, index, 'operator', value)} />
            </Col>
            {
              operation.type == 'column' &&
              <Col sm={8} md={8} lg={8}>
                <ColumnSelect column={operation.column}
                              columnList={columnList}
                              onChange={column => updateOperation(operationsKey, index, 'column', column)} />
              </Col>
            }
            {
              operation.type == 'value' &&
              <Col sm={8} md={8} lg={8}>
                <input type="text" className="form-control form-control-sm" value={operation.value || ''}
                  onChange={event => updateOperation(operationsKey, index, 'value', event.target.value)}
                />
              </Col>
            }
            <Col sm={2} md={2} lg={2}>
              <span className="button-right" >
                <ButtonTooltip tip="Remove" size="small" fnClick={event => removeOperation(operationsKey, index)} place="left" fa="fa-trash-o" />&nbsp;
              </span>
            </Col>
          </Row>
        ))
      }
      <Row style={{ marginTop: '10px' }}>
        <Col sm={12} md={12} lg={12}>
          <Button bsStyle="primary" bsSize="small" onClick={event => addOperation(operationsKey, 'column')}>
            Add column operation&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>&nbsp;&nbsp;
          <Button bsStyle="primary" bsSize="small" onClick={event => addOperation(operationsKey, 'value')}>
            Add scalar operation&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>&nbsp;&nbsp;
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default TableColumn;
