import React from 'react';
import {
  Row, Col, Nav, NavItem, Container
} from 'react-bootstrap';
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
import { IntlProvider, FormattedMessage } from 'react-intl';
import messagesDE from 'src/apps/admin/i18n/de.json';
import messagesEN from 'src/apps/admin/i18n/en.json';

class AdminHome extends React.Component {
  constructor(props) {
    super();
    this.state = {
      pageIndex: 0,
      locale: 'de',
    };
    this.handleSelect = this.handleSelect.bind(this);
  }

  handleSelect(pageIndex) {
    this.setState({
      pageIndex: Number(pageIndex)
    });
  }

  getMessages() {
    const { locale } = this.state;
    const locales = {
      en: messagesEN,
      de: messagesDE,
    };

    return { ...messagesEN, ...(locales[locale] || {}) };
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
          <Nav.Link eventKey={0}>
            <FormattedMessage id="dashboard" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={1}>
            <FormattedMessage id="userManagement" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={9}>
            <FormattedMessage id="devices" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={4}>
            <FormattedMessage id="groups" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={7}>
            <FormattedMessage id="UIFeatures" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={8}>
            <FormattedMessage id="textTemplates" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={2}>
            <FormattedMessage id="messagePublish" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={5}>
            <FormattedMessage id="loadOLSTerms" />
          </Nav.Link>
        </NavItem>
        {/* <NavItem>
          <Nav.Link eventKey={12}>Report-template Management</Nav.Link>
        </NavItem> */}
        <NavItem>
          <Nav.Link eventKey={13}>
            <FormattedMessage id="delayedJobs" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={14}>
            <FormattedMessage id="ChemSpectraLayouts" />
          </Nav.Link>
        </NavItem>
        <NavItem>
          <Nav.Link eventKey={15}>
            <FormattedMessage id="thirdPartyApps" />
          </Nav.Link>
        </NavItem>
      </Nav>
    );
  }

  render() {
    const { locale } = this.state;
    return (
      <IntlProvider messages={this.getMessages()} locale={locale} defaultLocale="en">
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
      </IntlProvider>
    );
  }
}

export default AdminHome;
