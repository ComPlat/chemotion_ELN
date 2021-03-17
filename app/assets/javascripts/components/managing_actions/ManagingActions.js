import React from 'react';
import { ButtonGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { List } from 'immutable';
import { ShareButton, MoveOrAssignButton, RemoveOrDeleteButton } from './ManagingActionButtons';
import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';
import UserActions from './../actions/UserActions';
import PermissionStore from './../stores/PermissionStore';
import PermissionActions from './../actions/PermissionActions';
import ManagingModalSharing from './ManagingModalSharing';
import ManagingModalCollectionActions from './ManagingModalCollectionActions';
import ManagingModalDelete from './ManagingModalDelete';
import ManagingModalRemove from './ManagingModalRemove';
import ManagingModalTopSecret from './ManagingModalTopSecret';
import ElementActions from '../actions/ElementActions';
import MatrixCheck from '../common/MatrixCheck';
import klasses from '../../../../../config/klasses.json';

const upState = (state) => {
  const { sample, reaction, screen, wellplate, research_plan } = state;
  const stateObj  = {
    sample: {
      checkedAll: sample ? sample.checkedAll : false,
      checkedIds: sample ? sample.checkedIds : List(),
      uncheckedIds: sample ? sample.uncheckedIds : List(),
    },
    reaction: {
      checkedAll: reaction ? reaction.checkedAll : false,
      checkedIds: reaction ? reaction.checkedIds : List(),
      uncheckedIds: reaction ? reaction.uncheckedIds : List(),
    },
    wellplate: {
      checkedAll: wellplate ? wellplate.checkedAll : false,
      checkedIds: wellplate ? wellplate.checkedIds : List(),
      uncheckedIds: wellplate ? wellplate.uncheckedIds : List(),
    },
    screen: {
      checkedAll: screen ? screen.checkedAll : false,
      checkedIds: screen ? screen.checkedIds : List(),
      uncheckedIds: screen ? screen.uncheckedIds : List(),
    },
    research_plan: {
      checkedAll: research_plan ? research_plan.checkedAll : false,
      checkedIds: research_plan ? research_plan.checkedIds : List(),
      uncheckedIds: research_plan ? research_plan.uncheckedIds : List(),
    }
  };

  // const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  //  if (MatrixCheck(currentUser.matrix, 'genericElement')) {

  // eslint-disable-next-line no-unused-expressions
  klasses && klasses.forEach((klass) => {
    stateObj[`${klass}`] = {
      checkedAll: state[`${klass}`] ? state[`${klass}`].checkedAll : false,
      checkedIds: state[`${klass}`] ? state[`${klass}`].checkedIds : List(),
      uncheckedIds: state[`${klass}`] ? state[`${klass}`].uncheckedIds : List(),
    };
  });
  //  }

  return (stateObj);
};

export default class ManagingActions extends React.Component {
  constructor(props) {
    super(props);
    const { currentUser, genericEls } = UserStore.getState();
    this.state = {
      currentUser,
      currentCollection: { id: 0 },
      sharing_allowed: false,
      deletion_allowed: false,
      remove_allowed: false,
      is_top_secret: false,
      genericEls: [],
      ...upState({})
    };

    this.handleButtonClick = this.handleButtonClick.bind(this);
    this.onChange = this.onChange.bind(this);

    this.onUserChange = this.onUserChange.bind(this);
    this.onPermissionChange = this.onPermissionChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserChange);
    UIStore.listen(this.onChange);
    PermissionStore.listen(this.onPermissionChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserChange);
    UIStore.unlisten(this.onChange);
    PermissionStore.unlisten(this.onPermissionChange);
  }

  onChange(state) {
    const {
      sample, reaction, screen, wellplate, research_plan, genericEl, currentCollection
    } = state;
    if (this.collectionChanged(state)) {
      this.setState({
        sharing_allowed: false,
        deletion_allowed: false,
        remove_allowed: false,
        is_top_secret: false,
        hasSel: false,
        currentCollection
      });
    }
    else if (this.checkUIState(state)) {
      const hasSel = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'].concat(klasses || []).find(el => (
        state[el] && (state[el].checkedIds.size > 0 || state[el].checkedAll)));
      PermissionActions.fetchPermissionStatus(state);
      this.setState({
        ...upState(state), hasSel
      });
    }
  }

  onUserChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({
        currentUser: state.currentUser,
      });
    }
    if (typeof state.genericEls !== 'undefined' && state.genericEls !== null) {
      this.setState({
        genericEls: state.genericEls
      });
    }
  }

  onPermissionChange(state) {
    this.setState({ ...state });
  }

  collectionChanged(state) {
    const { currentCollection } = state;
    if (typeof currentCollection === 'undefined' || currentCollection == null) {
      return false;
    }
    const { id, is_sync_to_me } = currentCollection;
    return this.state.currentCollection.id !== id ||
      this.state.currentCollection.is_sync_to_me !== is_sync_to_me;
  }

  checkUIState(state) {
    const genericNames = (this.state.genericEls && this.state.genericEls.map(el => el.name)) || [];
    const elNames = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'].concat(genericNames);
    const result = elNames.find(el => ( this.state[el] && state[el] && (
      state[el].checkedIds !== this.state[el].checkedIds ||
      state[el].checkedAll !== this.state[el].checkedAll ||
      state[el].uncheckedIds !== this.state[el].uncheckedIds
    )));
    return result;
  }

  handleButtonClick(type) {
    const modalProps = { show: true, action: '', listSharedCollections: false };
    switch(type) {
      case 'share':
        if(!this.state.is_top_secret) {
          modalProps.title = "Sharing";
          modalProps.component = ManagingModalSharing;
        } else {
          modalProps.title = "Sharing not allowed";
          modalProps.component = ManagingModalTopSecret;
        }
        break;
      case 'move':
        modalProps.title = "Move to Collection";
        modalProps.component = ManagingModalCollectionActions;
        modalProps.action = ElementActions.updateElementsCollection;
        break;
      case 'remove':
        modalProps.title = "Remove selected elements from this Collection?";
        modalProps.component = ManagingModalRemove;
        modalProps.action = ElementActions.removeElementsCollection;
        break;
      case 'assign':
        modalProps.title = "Assign to Collection";
        modalProps.component = ManagingModalCollectionActions;
        modalProps.action = ElementActions.assignElementsCollection;
        modalProps.listSharedCollections = true;
        break;
      case 'delete':
        modalProps.title = "Delete from all Collections?";
        modalProps.component = ManagingModalDelete;
        modalProps.action = ElementActions.deleteElements;
        break;
    };

    this.props.updateModalProps(modalProps);
  }

  render() {
    const {
      currentCollection, sharing_allowed, deletion_allowed, remove_allowed, is_top_secret, hasSel
    } = this.state;
    const { is_locked, is_shared, sharer, is_sync_to_me, label } = currentCollection;
    const isAll = is_locked && label === 'All';
    const noSel = !hasSel

    const moveDisabled = noSel || isAll;
    const assignDisabled = noSel;
    const removeDisabled = noSel || isAll || !deletion_allowed; //!remove_allowed
    const deleteDisabled = noSel || !deletion_allowed;
    const shareDisabled = noSel || !sharing_allowed;

    return (
      <div style={{ display: 'inline', float: 'left', marginRight: 10 }}>
        <ButtonGroup>
          <MoveOrAssignButton
            assignDisabled={assignDisabled}
            moveDisabled={moveDisabled}
            onClick={this.handleButtonClick}
            customClass={this.props.customClass}
          />
          <RemoveOrDeleteButton
            removeDisabled={removeDisabled}
            deleteDisabled={deleteDisabled}
            onClick={this.handleButtonClick}
            customClass={this.props.customClass}
          />
          <ShareButton
            isDisabled={shareDisabled}
            onClick={this.handleButtonClick}
            customClass={this.props.customClass}
          />
        </ButtonGroup>
      </div>
    );
  }
}

ManagingActions.propTypes = {
  updateModalProps: PropTypes.func.isRequired,
  customClass: PropTypes.string,
  genericEls: PropTypes.array
};

ManagingActions.defaultProps = {
  customClass: null,
  genericEls: []
};
