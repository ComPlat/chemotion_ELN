import React from 'react'
import {NavDropdown, Navbar, MenuItem} from 'react-bootstrap';

const NavHead = () => {
  let isHome = window.location.href.match(/\/home/)
  return(
    <Navbar.Brand>
      <NavDropdown title='Chemotion' className="navig-brand" id="bg-nested-dropdown-brand">
        <MenuItem eventKey="11" href="http://www.chemotion.net" target="_blank">Chemotion repository</MenuItem>
        <MenuItem eventKey="12" href="http://www.chemotion.net/mf/traffics" target="_blank">Material Finder</MenuItem>
        <MenuItem eventKey="13" href="http://www.complat.kit.edu/" target="_blank">Complat</MenuItem>
        <MenuItem eventKey="14" href="https://github.com/ComPlat" target="_blank">Complat on Github</MenuItem>
        <MenuItem divider />
        <MenuItem eventKey='15' href={isHome ? '/' : '/home'} target="_self">{isHome ? 'ELN' : 'Home'}</MenuItem>
      </NavDropdown>
    </Navbar.Brand>
  )
}

NavHead.propTypes = {
}

export default NavHead;
