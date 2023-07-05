import React from 'react';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it
} from 'mocha';
import CommentFactory from 'factories/CommentFactory';
import CommentModal from 'src/components/common/CommentModal';
import Sample from '../../../../../../app/packs/src/models/Sample';

Enzyme.configure({ adapter: new Adapter() });

const sample = Sample.buildEmpty(2);

const createWrapper = () => shallow(
  <CommentModal
    element={sample}
  />
);

describe('comment modal', () => {
  const wrapper = createWrapper();

  it('should create a comment modal', () => {
    expect(wrapper.find('.commentList')).toHaveLength(1);
  });

  it('should call markCommentResolved function on button click', () => {
    const instance = wrapper.instance();
    const newComment = CommentFactory.createComment('new comment', 10, sample.id);
    console.log('comment new');
    instance.setState({
      comments: [newComment],
      showCommentModal: true,
      showCommentSection: true,
      section: 'sample_properties',
    });
    expect(wrapper.state().showCommentModal).toEqual(true);
    expect(wrapper.state().comments.length).toEqual(1);
    // console.log(wrapper.html());
    // console.log(wrapper.state());
    console.log('comment after');
    wrapper.find('.resolve-button').simulate('click');
    expect(wrapper.find('.resolve-button')).toHaveLength(1);
    // console.log(wrapper.debug());
    // const markCommentResolvedSpy = sinon.spy(instance, 'markCommentResolved');
    // expect(markCommentResolvedSpy).toHaveBeenCalled();
  });
});
