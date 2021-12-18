import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import scriptLoader from 'react-async-script-loader';
import { Grid, Row, Col } from 'react-bootstrap';

import AbbreviationContainer from '../containers/AbbreviationContainer';
import ArchivedManagementContainer from '../containers/ArchivedManagementContainer';
import HeaderMenuContainer from '../containers/HeaderMenuContainer';
import MainContentContainer from '../containers/MainContentContainer';
import LoadingModalContainer from '../containers/LoadingModalContainer';
import ImportModalContainer from '../containers/ImportModalContainer';
import FileStorageContainer from '../containers/FileStorageContainer';
import Notifications from '../../Notifications';

import * as types from '../actions/ActionTypes';

class Root extends Component {
  componentDidMount() {
    const {
      isScriptLoaded, isScriptLoadSucceed, attachEditor,
      getCurrentVersion
    } = this.props;

    getCurrentVersion();

    const check = isScriptLoaded && isScriptLoadSucceed;
    if (!check) return;

    attachEditor('chemscanner-cdjs-container');
  }

  UNSAFE_componentWillReceiveProps({
    isScriptLoaded,
    isScriptLoadSucceed,
    attachEditor
  }) {
    const check = (
      isScriptLoaded && isScriptLoadSucceed && !this.props.isScriptLoaded
    );
    if (!check) return;

    attachEditor('chemscanner-cdjs-container');
  }

  render() {
    const { modal, ui } = this.props;
    const view = ui.get('view');

    let viewContainer = <span />;
    switch (view) {
      case types.VIEW_SCANNED_FILES:
        viewContainer = <MainContentContainer modal={modal} />;
        break;
      case types.VIEW_ABBREVIATION:
        viewContainer = <AbbreviationContainer />;
        break;
      case types.VIEW_FILE_STORAGE:
        viewContainer = <FileStorageContainer />;
        break;
      case types.VIEW_ARCHIVED_MANAGEMENT:
        viewContainer = <ArchivedManagementContainer />;
        break;
      default:
        break;
    }

    return (
      <Grid fluid className="chemscanner-grid">
        <div id="chemscanner-cdjs-container" />
        <Row style={{ position: 'relative', zIndex: '9' }}>
          <Col xs={18} md={12}>
            <HeaderMenuContainer />
          </Col>
        </Row>
        <Row>
          <Col xs={18} md={12} className="chemscanner-files-contents">
            {viewContainer}
          </Col>
        </Row>
        <Row>
          <LoadingModalContainer />
          <ImportModalContainer />
          <Notifications />
        </Row>
      </Grid>
    );
  }
}

Root.propTypes = {
  ui: PropTypes.instanceOf(Immutable.Map).isRequired,
  isScriptLoaded: PropTypes.bool.isRequired,
  isScriptLoadSucceed: PropTypes.bool.isRequired,
  attachEditor: PropTypes.func.isRequired,
  getCurrentVersion: PropTypes.func.isRequired,
  modal: PropTypes.string
};

Root.defaultProps = {
  modal: ''
};

const scriptUrl = '/cdjs/chemdrawweb/chemdrawweb.js';
// const scriptUrl = 'https://chemdrawdirect.perkinelmer.cloud/js/chemdrawweb/chemdrawweb.js';

export default scriptLoader(scriptUrl)(Root);
