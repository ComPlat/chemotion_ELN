/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import IndentifierInput from './IndentifierInput';

const IdentifierForm = props => (
  <div>
    {
      props.identifiers && props.identifiers.map((identifier, index) => {
        if (identifier.type === props.type) {
          return (<IndentifierInput
            key={index}
            id={index}
            type={identifier.type}
            tableIndex={identifier.tableIndex}
            lineNumber={identifier.lineNumber}
            metadataKey={identifier.metadataKey}
            headerKey={identifier.headerKey}
            value={identifier.value}
            isRegex={identifier.isRegex}
            options={props.data}
            removeIdentifier={props.removeIdentifier}
            updateIdentifier={props.updateIdentifier}
          />);
        }
        return (<span key={index} />);
      })
    }
    <Row style={{ marginTop: '10px' }}>
      <Col sm={12} md={12} lg={12}>
        <Button bsStyle="primary" bsSize="small" onClick={() => props.addIdentifier(props.type)}>
          Add Identifier&nbsp;<i className="fa fa-plus" aria-hidden="true" />
        </Button>
      </Col>
    </Row>
  </div>
);

export default IdentifierForm;
