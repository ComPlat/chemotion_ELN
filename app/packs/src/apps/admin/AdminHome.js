import React from 'react';
import { Row, Col, Nav, NavItem, Container } from 'react-bootstrap';
import AdminNavigation from 'src/apps/admin/AdminNavigation';
import Notifications from 'src/components/Notifications';
import AdminDashboard from 'src/apps/admin/AdminDashboard';
import UserManagement from 'src/apps/admin/UserManagement';
import GroupsDevices from 'src/apps/admin/GroupsDevices';
import MessagePublish from 'src/apps/admin/MessagePublish';
import OlsTerms from 'src/apps/admin/OlsTerms';
import MatrixManagement from 'src/apps/admin/MatrixManagement';
import TextTemplateContainer from 'src/apps/admin/textTemplates/TextTemplateContainer';
import DelayedJobs from 'src/apps/admin/DelayedJobs';
import ChemSpectraLayouts from 'src/apps/admin/ChemSpectraLayouts';
import DevicesList from 'src/apps/admin/devices/DevicesList';
// import TemplateManagement from 'src/apps/admin/TemplateManagement';

class AdminHome extends React.Component {
  constructor(props) {
    super();
    this.state = {
      showTree: true,
      pageIndex: 0,
    };
    this.toggleTree = this.toggleTree.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
  }

  toggleTree() {
    const { showTree } = this.state;
    this.setState({
      showTree: !showTree,
    });
  }

  handleSelect(pageIndex) {
    this.setState({
      pageIndex: Number(pageIndex)
    });
  }

  mainContent() {
    const { pageIndex } = this.state;
    if (pageIndex === 0) {
      return this.renderContent(<AdminDashboard />);
    } else if (pageIndex === 1) {
      return this.renderContent(<UserManagement />);
    } else if (pageIndex === 2) {
      return this.renderContent(<MessagePublish />);
    } else if (pageIndex === 4) {
      return this.renderContent(<GroupsDevices />);
    } else if (pageIndex === 5) {
      return this.renderContent(<OlsTerms />);
    } else if (pageIndex === 7) {
      return this.renderContent(<MatrixManagement />);
    } else if (pageIndex === 8) {
      return this.renderContent(<TextTemplateContainer />);
    } else if (pageIndex === 9) {
      return this.renderContent(<DevicesList />);
    } else if (pageIndex === 12) {
      return this.renderContent(<TemplateManagement />);
    } else if (pageIndex === 13) {
      return this.renderContent(<DelayedJobs />);
    } else if (pageIndex === 14) {
      return this.renderContent(<ChemSpectraLayouts />);
    }
    return (null);
  }

  renderTree() {
    const { showTree, pageIndex } = this.state;
    if (!showTree) {
      return null;
    }

    return (
      <Nav className="flex-column fs-4" variant="pills" activeKey={pageIndex} onSelect={this.handleSelect}>
        <NavItem>
          <Nav.Link eventKey={0}>Dashboard</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={1}>User Management</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={9}>Devices</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={4}>Groups</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={7}>UI features</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={8}>Text Templates</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={2}>Message Publish</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={5}>Load OLS Terms</Nav.Link>
        </NavItem>
        {/* <NavItem>
          <Nav.Link eventKey={12}>Report-template Management</Nav.Link>
        </NavItem> */}
        <NavItem>
          <Nav.Link eventKey={13}>Delayed Jobs</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={14}>ChemSpectra Layouts</Nav.Link>
        </NavItem>
      </Nav>

    );
  }

  renderContent(component) {
    return (
      <Col >
        {component}
      </Col>
    );
  }

  render() {
    return (
      <div>
        <Container fluid>
          <Row className="mb-3">
            <AdminNavigation toggleTree={this.toggleTree} />
          </Row>
          <Row className='flex-grow-1'>
            <Col
              xs={2}
              className={`sidebar ${this.state.showTree ? '' : 'collapsed'}`}
              style={{
                overflow: 'hidden',
                maxWidth: this.state.showTree ? '25rem' : '0',
                transition: 'none'
              }}
            >
              {this.state.showTree && this.renderTree()}
            </Col >
            <Col className="flex-grow-1"
              style={{
                transition: 'none',
                width: this.state.showTree ? 'calc(100% - 25rem)' : '100%',
                maxWidth: this.state.showTree ? 'calc(100% - 25rem)' : '100%',
              }}>
              {this.mainContent()}
            </Col>
          </Row>
          <Row>
            <Col>
              <Notifications />
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

export default AdminHome;
