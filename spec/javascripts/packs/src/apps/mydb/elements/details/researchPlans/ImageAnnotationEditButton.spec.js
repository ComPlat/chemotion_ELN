/* global describe, context, it */

import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import { spy } from 'sinon';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import Attachment from 'src/models/Attachment';

import { Button } from 'react-bootstrap';

configure({ adapter: new Adapter() });

describe('ImageAnnotationEditButton', () => {
  const pngAttachment = new Attachment({ filename: 'example.png' });
  const onClick = spy();

  it('calls onClick', () => {
    const wrapper = shallow(
      React.createElement(ImageAnnotationEditButton, { attachment: pngAttachment, onClick: onClick })
    );
    wrapper.find(Button).simulate('click');
    expect(onClick.called).toBeTruthy();
  });

  describe('.render()', () => {
    context('with not persisted attachment(png)', () => {
      pngAttachment.isNew = true;
      const wrapper = shallow(
        React.createElement(ImageAnnotationEditButton, { attachment: pngAttachment, onClick: onClick })
      );

      it('button is rendered but disabled', () => {
        const button = wrapper.find(Button);
        expect(button.prop('disabled')).toBeTruthy();
        expect(button.exists('.fa-pencil-square')).toBeTruthy();
      });
    });

    context('with persisted attachment(png)', () => {
      pngAttachment.isNew = false;
      const wrapper = shallow(
        React.createElement(ImageAnnotationEditButton, { attachment: pngAttachment, onClick: onClick })
      );

      it('button is rendered and not disabled', () => {
        const button = wrapper.find(Button);
        expect(button.prop('disabled')).toBeFalsy();
        expect(button.exists('.fa-pencil-square')).toBeTruthy();
      });
    });

    context('with no attachment', () => {
      const wrapper = shallow(React.createElement(ImageAnnotationEditButton, { attachment: null, onClick: onClick }));

      it('button is not rendered', () => {
        expect(wrapper.html()).toEqual(null);
      });
    });
  });
});
