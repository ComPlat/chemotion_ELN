import React from 'react';
import { Panel, Button, FormControl, InputGroup, Col } from 'react-bootstrap';
import UsersFetcher from '../components/fetchers/UsersFetcher';
import queryString from 'query-string'

export default class GrantPermission extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
    };


    this.grantPermission = this.grantPermission.bind(this);
  }

  // componentDidMount() {
  //   this.setState({currentUser: UserActions.fetchCurrentUser()});
  // }

  renderSignInForm() {

  }

  renderGenerateToken() {

  }

  grantPermission() {
    const queryStringValue = queryString.parse(window.location.search.substring(1));
    this.setState({queryStringValue});
    UsersFetcher.grantPermission({client_id: queryStringValue.client_id, client_name: queryStringValue.client_name}).then((result) => {
      window.open(this.state.queryStringValue.returnUrl + "?token=" + result.token, "_top")
    });;
  }

  render() {
    return this.state.currentUser ? (
      <div className="new_user" >
        <input name="utf8" value="✓" type="hidden" />
        <input name="authenticity_token" value={authenticityToken} type="hidden" />
        <OverlayTrigger placement="left" overlay={<Tooltip id="login_tooltip">Log in with email or name abbreviation(case-senstive)</Tooltip>}>
          <FormGroup>
            <FormControl id="user_login" type="text" placeholder="Email or name abbreviation" name="user[login]" />
          </FormGroup>
        </OverlayTrigger>
        <FormGroup>
          <FormControl id="user_password" type="password" name="user[password]" placeholder="password" />
        </FormGroup>
        <Button type="submit" bsStyle="primary">
          <Glyphicon glyph="log-in" />
        </Button>
      </div>
    ) : (
      <Col md={7} className="small-col">
        <div className="new_user"  >
          <p>Are you sure to grant permission for application ABC XYZ?</p>
          <Button bsSize="xsmall" type="button" onClick={() => this.grantPermission()} >
            <i className="fa fa-plus" />Grant Permission
          </Button>
        </div>
      </Col>
    );
  }
}
