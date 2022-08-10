/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React from 'react';
import { Row, Col } from 'react-bootstrap';

const HeaderForm = props => (
  <div className="mb-3">
    <div>
      <h4><i><u><b>Table Header</b></u></i></h4>
    </div>
    {
      Object.keys(props.headerOptions).map((option, index) => (
        <Row key={index} style={{ marginTop: '10px' }}>
          <Col sm={4} md={4} lg={4}>{option}</Col>
          <Col sm={8} md={8} lg={8}>
            <select className="form-control form-control-sm" onChange={e => props.updateHeader(option, e.target.value)} id={option}>
              {
                props.headerOptions[option].map((select, selectIndex) => <option value={select} key={selectIndex}>{select}</option>)
              }
            </select>
          </Col>
        </Row>
        ))}
    <small className="text-muted">The data you pick here will be added to the metadata of your converted file.</small>
  </div>
);

export default HeaderForm;
