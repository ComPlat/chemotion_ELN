import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import QcContent from './components/QcContent';
import QcActions from '../actions/QcActions';
import QcStore from '../stores/QcStore';

class QcMain extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ...QcStore.getState(),
    };

    this.onChange = this.onChange.bind(this);
    this.renderQcBtn = this.renderQcBtn.bind(this);
    this.renderQcContent = this.renderQcContent.bind(this);
  }

  componentDidMount() {
    QcStore.listen(this.onChange);
  }

  componentWillUnmount() {
    QcStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  renderQcBtn() {
    const { loading } = this.state;
    const { sample } = this.props;
    const handleOnClick = () => {
      QcActions.setLoading();
      QcActions.loadInfers.defer({ sample });
    };
    let iconClsName = 'fa fa-cog fa-1x';
    if (loading) iconClsName += ' fa-spin fa-fw';
    const bsStyle = loading ? 'warning' : 'primary';

    return (
      <Button
        bsStyle={bsStyle}
        bsSize="small"
        onClick={handleOnClick}
        disabled={loading}
      >
        <i className={iconClsName} />
        <span className="g-marginLeft--10">Refresh</span>
      </Button>
    );
  }

  renderQcContent() {
    const { infers } = this.state;
    const { sample } = this.props;
    const infer = infers
      .map(i => (i.sId === sample.id ? i : null))
      .filter(r => r != null)[0];
    if (!infer) return null;
    return (
      <QcContent sample={sample} infer={infer} />
    );
  }

  render() {
    return (
      <div>
        { this.renderQcBtn() }
        { this.renderQcContent() }
      </div>
    );
  }
}

QcMain.propTypes = {
  sample: PropTypes.object.isRequired,
};

export default QcMain;
