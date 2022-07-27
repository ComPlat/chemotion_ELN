import React from 'react';
import { connect } from 'react-redux';

import LoadingModal from 'src/components/chemscanner/components/LoadingModal';

const LoadingModalContainer = props => <LoadingModal {...props} />;

const mapStateToProps = state => ({
  loading: state.get('ui').get('loading'),
});

export default connect(mapStateToProps)(LoadingModalContainer);
