import React from 'react';
import { Row, Col, Nav, NavItem, Container } from 'react-bootstrap';
import BaseNavigation from 'src/components/navigation/BaseNavigation';
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
      pageIndex: 0,
    };
    this.handleSelect = this.handleSelect.bind(this);
  }

  handleSelect(pageIndex) {
    this.setState({
      pageIndex: Number(pageIndex)
    });
  }

  mainContent() {
    const { pageIndex } = this.state;
    switch (pageIndex) {
      case 0: return <AdminDashboard />;
      case 1: return <UserManagement />;
      case 2: return <MessagePublish />;
      case 4: return <GroupsDevices />;
      case 5: return <OlsTerms />;
      case 7: return <MatrixManagement />;
      case 8: return <TextTemplateContainer />;
      case 9: return <DevicesList />;
      // case 12: return <TemplateManagement />;
      case 13: return <DelayedJobs />;
      case 14: return <ChemSpectraLayouts />;
      case 15: return <ThirdPartyApp />;
      default: return null;
    }
  }

  renderTree() {
    const { pageIndex } = this.state;

    return (
      <Nav className="flex-column fs-5 gap-3 mt-2" variant="pills" activeKey={pageIndex} onSelect={this.handleSelect}>
        <NavItem>
          <Nav.Link eventKey={0}>Dashboard</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={1}>User Management</Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={9}>Remote Devices</Nav.Link>
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

  render() {
    return (
      <div>
        <Container fluid>
          <Row className="mb-3">
            <BaseNavigation />
          </Row>
          <div className="d-flex gap-4">
            {this.renderTree()}
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
