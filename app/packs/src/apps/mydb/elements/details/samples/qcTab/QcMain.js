import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import QcContent from 'src/apps/mydb/elements/details/samples/qcTab/components/QcContent';
import QcActions from 'src/stores/alt/actions/QcActions';
import QcStore from 'src/stores/alt/stores/QcStore';
import UserStore from 'src/stores/alt/stores/UserStore';

class QcMain extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ...QcStore.getState(),
      profile: UserStore.getState().profile,
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
    const variant = loading ? 'warning' : 'primary';

    return (
      <Button
        variant={variant}
        size="sm"
        onClick={handleOnClick}
        disabled={loading}
      >
        <i className={iconClsName} />
        <span className="ms-3">Refresh</span>
      </Button>
    );
  }

  renderQcContent() {
    const { infers, profile } = this.state;
    const { sample } = this.props;
    const infer = infers
      .map(i => (i.sId === sample.id ? i : null))
      .filter(r => r != null)[0];
    if (!infer) return null;
    let curation = profile ? profile.curation : 2;
    if (curation === null) { curation = 2 }
    return (
      <QcContent
        sample={sample}
        infer={infer}
        curation={curation}
      />
    );
  }

  render() {
    return (
      <div>
        {this.renderQcBtn()}
        {this.renderQcContent()}
      </div>
    );
  }
}

QcMain.propTypes = {
  sample: PropTypes.object.isRequired,
};

export default QcMain;
