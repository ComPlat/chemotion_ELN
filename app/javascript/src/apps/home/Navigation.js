import React from 'react';
import UserAuth from 'src/components/navigation/UserAuth';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import NavNewSession from 'src/components/navigation/NavNewSession';
import ChemotionLogo from 'src/components/common/ChemotionLogo';
import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import DocumentHelper from 'src/utilities/DocumentHelper';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      omniauthProviders: {},
      extraRules: {},
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchOmniauthProviders();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({
        currentUser: state.currentUser
      });
    }
    if (state.omniauthProviders !== this.state.omniauthProviders) {
      this.setState({
        omniauthProviders: state.omniauthProviders
      });
    }

    if (state.extraRules !== this.state.extraRules) {
      this.setState({
        extraRules: state.extraRules
      });
    }
  }

  token() {
    return DocumentHelper.getMetaContent('csrf-token');
  }

  userSession() {
    const { currentUser, omniauthProviders, extraRules } = this.state;
    return currentUser
      ? <UserAuth />
      : (
        <NavNewSession
          authenticityToken={this.token()}
          omniauthProviders={omniauthProviders}
          extraRules={extraRules}
        />
      );
  }

  render() {
    return (
      <div className="bg-gray-200 d-flex align-items-center justify-content-between px-4 py-2">
        <a href="/mydb">
          <ChemotionLogo />
        </a>

        <div className="d-flex gap-2">
          <SupportMenuButton linkToEln />
          {this.userSession()}
        </div>
      </div>
    );
  }
}
