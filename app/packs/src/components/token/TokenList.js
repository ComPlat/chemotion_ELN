import React from 'react';
import { Row, Button, FormControl, InputGroup, Col } from 'react-bootstrap';
import UsersFetcher from '../../components/fetchers/UsersFetcher';

export default class TokenList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      userTokens: []
    };
    this.revokeToken = this.revokeToken.bind(this);
  }

  componentDidMount() {
    this.getTokens();
  }

  getTokens() {
    UsersFetcher.fetchTokens().then((result) => {
      this.setState({userTokens: result.token});
    });
  }

  revokeToken(token) {
    console.log('revokeToken');

    UsersFetcher.revokeToken(token).then(()=> {
      this.getTokens()
    });
  }

  render() {
    const { userTokens } = this.state;
    return (
      
        <div>
          <Row style={{ maxWidth: '2000px', maxHeight: '1000px', margin: 'auto', borderStyle: 'solid' }}>
            <Col md={1}>Id</Col>
            <Col md={1}>Client Id</Col>
            <Col md={1}>Client Name</Col>
            <Col md={3}>Token</Col>
            <Col md={3}>Refresh Token</Col>
            <Col md={2}></Col>
          </Row>
          {userTokens.map((u) => (
            <Row style={{ maxWidth: '2000px', maxHeight: '1000px', margin: 'auto', overflowWrap: 'break-word'}}>
            <Col md={1}>{u.id}</Col>
            <Col md={1}>{u.client_id}</Col>
            <Col md={1}>{u.client_name}</Col>
            <Col md={3}>{u.token}</Col>
            <Col md={3}>{u.refresh_token}</Col>
            <Col md={2}><Button bsSize="xsmall" type="button" bsStyle="danger" onClick={()=>this.revokeToken(u.id)} >
                             <i className="fa fa-eraser" />&nbsp;Revoke
            </Button></Col>
          </Row>))}
      </div>
    );
  }
}
