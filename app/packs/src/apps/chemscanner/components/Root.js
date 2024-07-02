import Immutable from 'immutable';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import scriptLoader from 'react-async-script-loader';
import { Row, Col } from 'react-bootstrap';
import Grid from 'src/components/legacyBootstrap/Grid'

import AbbreviationContainer from 'src/apps/chemscanner/containers/AbbreviationContainer';
import HeaderMenuContainer from 'src/apps/chemscanner/containers/HeaderMenuContainer';
import MainContentContainer from 'src/apps/chemscanner/containers/MainContentContainer';
import LoadingModalContainer from 'src/apps/chemscanner/containers/LoadingModalContainer';

class Root extends Component {
  componentDidMount() {
    const { isScriptLoaded, isScriptLoadSucceed, attachEditor } = this.props;
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
    const abbView = ui.get('abbView') || false;

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
            {abbView ?
              <AbbreviationContainer /> :
              <MainContentContainer modal={modal} />
            }
          </Col>
        </Row>
        <Row>
          <LoadingModalContainer />
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
  modal: PropTypes.string
};

Root.defaultProps = {
  modal: ''
};

// const scriptUrl = '/cdjs/chemdrawweb/chemdrawweb.js';
const scriptUrl = 'https://chemdrawdirect.perkinelmer.cloud/js/chemdrawweb/chemdrawweb.js';
export default scriptLoader(scriptUrl)(Root);
