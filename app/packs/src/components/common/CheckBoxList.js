import React from 'react';
import {
  Form,
  Row,
  Col,
  Card
} from 'react-bootstrap';
import PropTypes from 'prop-types';

const CheckBoxList = ({
  items,
  toggleCheckbox,
  toggleCheckAll,
  checkedAll,
}) => {
  const checkBoxs = items.map((setting) => {
    const { text, checked } = setting;
    return (
      <Col key={text} sm={3}>
        <Form.Check
          type="checkbox"
          checked={checked}
          label={text}
          id={text}
          onChange={() => toggleCheckbox(text, checked)}
        />
      </Col>
    );
  });

  const genId = Math.random().toString().substr(2, 10);

  return (
    <Card className="mb-3">
      <Card.Header>
        <Form.Check
          id={genId}
          type="checkbox"
          checked={checkedAll}
          label={checkedAll ? "Deselect all" : "Select all"}
          onChange={() => toggleCheckAll()}
        />
      </Card.Header>

      <Card.Body>
        <Row className="align-items-center">
          {checkBoxs}
        </Row>
      </Card.Body>
    </Card>
  );
};

CheckBoxList.propTypes = {
  items: PropTypes.array,
  checkedAll: PropTypes.bool,
  toggleCheckAll: PropTypes.func,
  toggleCheckbox: PropTypes.func,
};

export default CheckBoxList;
