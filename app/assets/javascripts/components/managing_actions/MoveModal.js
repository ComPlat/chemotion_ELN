import React from 'react';
import Select from 'react-select';

import CollectionActions from '../actions/CollectionActions';
import CollectionManagementModal from './CollectionManagementModal';

export default class MoveModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <CollectionManagementModal 
        action={CollectionActions.updateElementsCollection}
        modal_title={"Move to Collection"}
        show_collections={true}
      />
    )
  }
}
