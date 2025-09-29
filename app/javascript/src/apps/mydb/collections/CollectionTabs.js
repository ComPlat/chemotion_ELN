import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import {
  Button, Modal, Col, Row
} from 'react-bootstrap';
import _ from 'lodash';
import { List } from 'immutable';

import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { capitalizeWords } from 'src/utilities/textHelper';

    UserActions.fetchProfile();

    const onUserStoreChange = (state) => {
      const data = (state.profile && state.profile.data) || {};
      if (!data) {
        UserActions.fetchProfile();
      }

      let layout;
      if (_.isEmpty(node.tabs_segment[name])) {
        // Use element-specific layout, or generic layout for generic elements, or empty
        if (profileData && profileData[`layout_detail_${name}`]) {
          layout = profileData[`layout_detail_${name}`];
        } else if (isGeneric && profileData && profileData['layout_detail_generic']) {
          layout = profileData['layout_detail_generic'];
        } else {
          layout = {};
        }
      } else {

      return acc;
    }, {});

    setCurrentCollection(node);
    setShowModal(true);
    setLayouts(layouts);
  }


    if (node.is_locked || node.id < 1) {
      return (
        <div className="ms-3 mb-2">{node.label}</div>
      );
    }

    return (
      <div className="d-flex align-items-center justify-content-between mb-2 bg-dark-subtle">
        <div className="ms-3">{node.label}</div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onClickCollection(node)}
          title="Click to edit collection tab sorting"
        >
          <i className="fa fa-pencil" />
        </Button>
      </div>
    );
  }


}

export default observer(CollectionTabs);
