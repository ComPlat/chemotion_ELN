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
import TemplateManagement from 'src/apps/admin/TemplateManagement';

class AdminHome extends React.Component {
  constructor(props) {
    super();
    this.state = {
      showTree: true,
      pageIndex: 0,
      contentClassName: 'small-col main-content',
    };
    this.toggleTree = this.toggleTree.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
  }

  toggleTree() {
    const { showTree } = this.state;
    this.setState({
      showTree: !showTree,
      contentClassName: showTree ? 'small-col full-main' : 'small-col main-content'
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
    return (<div />);
  }

  tree() {
    const { showTree, pageIndex } = this.state;
    if (!showTree) {
      return <div />;
    }

    return (
      <Nav className="flex-column" variant="pills" activeKey={pageIndex} onSelect={this.handleSelect}>
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
            {/* <NavItem eventKey={12}>Report-template Management</NavItem> */}
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
    const { contentClassName } = this.state;
    return (
      <Col className={contentClassName} >
        {component}
      </Col>
    );
  }

  render() {
    return (
      <div>
        <Container fluid>
          <Row className="my-3">
            <AdminNavigation toggleTree={this.toggleTree} />
          </Row>
          <Row className="mb-3">
            <Col xs={2}>
              {this.tree()}
            </Col>
            {this.mainContent()}
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
