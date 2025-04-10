import { Button } from 'react-bootstrap';
import SDSAttachmentModal from '../../../../../../app/javascript/src/components/chemicals/SDSAttachmentModal';

const React = require('react');
const { Modal, Form } = require('react-bootstrap');
const { configure, shallow } = require('enzyme');
const Adapter = require('@wojtekmaj/enzyme-adapter-react-17');
const expect = require('expect');
const sinon = require('sinon');
const { describe, it, beforeEach } = require('mocha');

configure({ adapter: new Adapter() });

describe('SDSAttachmentModal', () => {
  const mockOnHide = sinon.spy();
  const mockOnSubmit = sinon.spy();

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      React.createElement(SDSAttachmentModal, {
        show: true,
        onHide: mockOnHide,
        onSubmit: mockOnSubmit
      })
    );
  });

  it('renders modal with correct title', () => {
    expect(wrapper.find(Modal.Title).text()).toEqual('Attach Safety Sheet File');
  });

  it('renders the product number input field', () => {
    const productNumberGroup = wrapper.find(Form.Group).findWhere((n) => n.prop('controlId') === 'productNumber');
    expect(productNumberGroup.exists()).toBe(true);
  });

  it('renders the vendor name input field', () => {
    const vendorNameGroup = wrapper.find(Form.Group).findWhere((n) => n.prop('controlId') === 'vendorName');
    expect(vendorNameGroup.exists()).toBe(true);
  });

  it('renders the file upload input field', () => {
    const fileUploadGroup = wrapper.find(Form.Group).findWhere((n) => n.prop('controlId') === 'fileUpload');
    expect(fileUploadGroup.exists()).toBe(true);
  });

  it('renders the product link input field', () => {
    const productLinkGroup = wrapper.find(Form.Group).findWhere((n) => n.prop('controlId') === 'productLink');
    expect(productLinkGroup.exists()).toBe(true);
  });

  it('renders the safety sheet link input field', () => {
    const safetySheetLinkGroup = wrapper.find(Form.Group).findWhere((n) => n.prop('controlId') === 'safetySheetLink');
    expect(safetySheetLinkGroup.exists()).toBe(true);
  });

  it('checks that submit button is present', () => {
    const submitButton = wrapper.find(Button).findWhere((n) => n.prop('variant') === 'primary');
    expect(submitButton.exists()).toBe(true);
    expect(submitButton.text()).toEqual('Submit');
  });

  it('checks that close button is present', () => {
    const closeButton = wrapper.find(Button).findWhere((n) => n.prop('variant') === 'secondary');
    expect(closeButton.exists()).toBe(true);
    expect(closeButton.text()).toEqual('Close');
  });

  it('triggers onHide when close button is clicked', () => {
    const closeButton = wrapper.find(Button).findWhere((n) => n.prop('variant') === 'secondary');
    closeButton.simulate('click');
    expect(mockOnHide.called).toBe(true);
  });
});
