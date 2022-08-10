/* eslint-disable react/prop-types */
/* eslint-disable react/no-array-index-key */
import React from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import { ButtonTooltip } from 'src/apps/admin/generic/Utils';

const HeaderForm = (props) => {
  const {
    header, addHeader, updateHeader, removeHeader
  } = props;

  return (
    <div className="mb-3">
      <div>
        <h4><i><u><b>Table Header</b></u></i></h4>
      </div>
      {
        Object.keys(header).map((key, index) => {
          const value = header[key];

          return (
            <Row key={`rk${key}${index}`} style={{ marginTop: '10px' }}>
              <Col sm={4} md={4} lg={4}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  onChange={event => updateHeader(event.target.value, value, key)}
                  value={key}
                />
              </Col>
              <Col sm={6} md={6} lg={6}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  onChange={event => updateHeader(key, event.target.value)}
                  value={value}
                />
              </Col>
              <Col sm={2} md={2} lg={2}>
                <span className="button-right" >
                  <ButtonTooltip tip="Remove" size="small" fnClick={() => removeHeader(key)} place="left" fa="fa-trash-o" />&nbsp;
                </span>
              </Col>
            </Row>
          );
        })
      }
      <Row style={{ marginTop: '10px' }}>
        <Col sm={12} md={12} lg={12}>
          <Button bsStyle="primary" bsSize="small" onClick={addHeader}>
            Add header value&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>&nbsp;&nbsp;
        </Col>
      </Row>
      <div>
        <small className="text-muted">The data you pick here will be added to the metadata of your converted file.</small>
      </div>
    </div>
  );
};

export default HeaderForm;
