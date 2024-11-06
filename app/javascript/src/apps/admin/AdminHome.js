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
import ThirdPartyApp from 'src/apps/admin/ThirdPartyApp';

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
    //} else if (pageIndex === 12) {
    //  return this.renderContent(<TemplateManagement />);
    } else if (pageIndex === 13) {
      return this.renderContent(<DelayedJobs />);
    } else if (pageIndex === 14) {
      return this.renderContent(<ChemSpectraLayouts />);
    } else if (pageIndex === 15) {
      return this.renderContent(<ThirdPartyApp />);
    }
    return (null);
  }

  renderTree() {
    const { showTree, pageIndex } = this.state;
    if (!showTree) {
      return null;
    }

    return (
      <Nav className="flex-column fs-5 gap-3 mt-2" variant="pills" activeKey={pageIndex} onSelect={this.handleSelect}>
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
        <NavItem>
          <Nav.Link eventKey={15}>Third Party Apps</Nav.Link>
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
          <div className="d-flex gap-4">
            {this.state.showTree && 
              this.renderTree()
            }
            <div className="flex-grow-1">
              {this.mainContent()}
            </div>
          </div>
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
