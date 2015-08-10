import React from 'react';
import {Button, Nav, NavItem} from 'react-bootstrap';

export default class ElementFilter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeFilters: []
    }
  }

  _toggleFilterState(filterId) {
    let {activeFilters} = this.state;
    let result = activeFilters.slice();
    if (this._isActive(filterId)) {
      let foundIndex = activeFilters.indexOf(filterId);
      result.splice(foundIndex, 1);
    } else {
      result.push(filterId);
    }
    this.setState({
      activeFilters: result
    });
  }

  _isActive(filterId) {
    let {activeFilters} = this.state;
    return activeFilters.includes(filterId);
  }

  render() {
    return (
      <Nav bsStyle='pills' justified onSelect={(event) => this._toggleFilterState(event)}>
        <NavItem eventKey={0} active={this._isActive(0)}>Sample</NavItem>
        <NavItem eventKey={1} active={this._isActive(1)}>Reaction</NavItem>
        <NavItem eventKey={2} active={this._isActive(2)}>Wellplate</NavItem>
      </Nav>
    )
  }
}
