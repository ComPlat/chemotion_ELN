import React, { useContext, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Container,
  Row,
  Col,
  Button
} from 'react-bootstrap';
import uuid from 'uuid';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function omniauthLabel(icon, name) {
  if (icon) {
    return (
      <img src={`/images/providers/${icon}`} alt={name} title={name} />
    );
  }
  return name;
}

const LoginOptions = () => {
  const { userStore } = useContext(StoreContext);
  const { omniauthProviders } = userStore || [];

  useEffect(() => {
    userStore.fetchOmniauthProviders();
  }, [userStore]);

  const keys = Object.keys(omniauthProviders);
  if (keys.length === 0) return null;

  const items = keys.map((key) => (
    <Col key={uuid.v1()} md={12 / keys.length} className="login-options">
      <Button href={`/users/auth/${key}`}>
        Login with &nbsp;
        {omniauthLabel(omniauthProviders[key].icon, omniauthProviders[key].label || key)}
      </Button>
    </Col>
  ));

  return (
    <Container>
      <Row>
        {items}
      </Row>
    </Container>
  );
};

const ObservedLoginOptions = observer(LoginOptions);

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('LoginOptions');
  if (domElement) { ReactDOM.render(<ObservedLoginOptions />, domElement); }
});

export default ObservedLoginOptions;
