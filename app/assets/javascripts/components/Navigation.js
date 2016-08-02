import React from 'react';
import {Nav, Navbar, NavDropdown, MenuItem} from 'react-bootstrap';
import UserAuth from './UserAuth';
import Search from './search/Search';
import ManagingActions from './managing_actions/ManagingActions';
import ContextActions from './contextActions/ContextActions';
import UIActions from './actions/UIActions';
import ReactDOM from 'react-dom';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.handleResize = this.handleResize.bind(this);
  }

  brandDropDown() {
    return (
      <NavDropdown title='Chemotion' className="navig-brand" id="bg-nested-dropdown-brand">
        <MenuItem eventKey="11" href="http://www.chemotion.net" target="_blank">Chemotion repository</MenuItem>
        <MenuItem eventKey="12" href="http://www.chemotion.net/mf/traffics" target="_blank">Material Finder</MenuItem>
        <MenuItem eventKey="13" href="http://www.complat.kit.edu/" target="_blank">Complat</MenuItem>
        <MenuItem eventKey="14" href="https://github.com/ComPlat" target="_blank">Complat on Github</MenuItem>
      </NavDropdown>
    )
  }
  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize(e = null) {
    let offsetHeight = ReactDOM.findDOMNode(this._navbar).offsetHeight ||  1;
    let windowHeight = window.innerHeight || 1;
    if (offsetHeight/windowHeight < 0.2) {
      UIActions.resizeWindow( offsetHeight );
    }else{UIActions.resizeWindow( false)}
  }

  render() {
    return (
      <Navbar inverse fluid fixedTop={this.props.fixedTop} ref={(e) => this._navbar = e}>
        <Navbar.Header>
          <Navbar.Brand>
            {this.brandDropDown()}
          </Navbar.Brand>
        </Navbar.Header>
        <Nav navbar>
          <div className='navbar-form'>
            <Search />
            <ManagingActions/>
            <ContextActions/>
          </div>
        </Nav>
        <UserAuth/>
      </Navbar>
    )
  }
}
Navigation.propTypes = {
  fixedTop: React.PropTypes.bool,
}
