import React from 'react';
import {Button, ButtonGroup} from 'react-bootstrap';

export default class ElementFilter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    }
  }

  render() {
    return (
      <ButtonGroup id="element-filter">
        <Button>Sample</Button>
        <Button>Reaction</Button>
        <Button>Wellplate</Button>
      </ButtonGroup>
    )
  }
}
