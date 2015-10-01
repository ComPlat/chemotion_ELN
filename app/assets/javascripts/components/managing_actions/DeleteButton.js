import React from 'react';
import {Button} from 'react-bootstrap';
import ElementActions from '../actions/ElementActions';
import UIStore from '../stores/UIStore';

export default class DeleteButton extends React.Component {
  constructor(props) {
    super(props);
  }

  _deleteSelection() {
    ElementActions.deleteElements(UIStore.getState())
  }

  render() {
    return (
      <Button onClick={e => this._deleteSelection()}>Delete Elements</Button>
    )
  }
}