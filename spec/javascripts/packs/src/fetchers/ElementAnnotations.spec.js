/* global describe, it, beforeEach, afterEach */
import expect from 'expect';
import sinon from 'sinon';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ScreensFetcher from 'src/fetchers/ScreensFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import CellLinesFetcher from 'src/fetchers/CellLinesFetcher';

const emptyContainer = () => ({ children: [], attachments: [] });

// callsFake so each fetch call gets a fresh Response (body can only be read once)
const makeFetchStub = (body = {}) => sinon.stub(global, 'fetch').callsFake(
  () => Promise.resolve(new Response(JSON.stringify(body)))
);

describe('Element-level annotation save (B2 regression)', () => {
  let fetchStub;
  let uploadContainerStub;
  let updateAttachablesStub;
  let updateAnnotationsStub;

  beforeEach(() => {
    uploadContainerStub = sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
    updateAttachablesStub = sinon.stub(AttachmentFetcher, 'updateAttachables').resolves();
    // Stub AnnotationsFetcher entirely — no real HTTP; each test spies further as needed
    updateAnnotationsStub = sinon.stub(AnnotationsFetcher, 'updateAnnotations').resolves();
    sinon.stub(AnnotationsFetcher, 'updateAnnotationsInContainer').resolves();
    sinon.stub(AnnotationsFetcher, 'updateAnnotationsOfAttachments').resolves();
  });

  afterEach(() => sinon.restore());

  describe('SamplesFetcher.update', () => {
    beforeEach(() => {
      sinon.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
      sinon.stub(SamplesFetcher, 'fetchById').resolves({});
      fetchStub = makeFetchStub({ sample: { id: 1 } });
    });

    it('calls updateAnnotations so element-level attachment annotations are saved', async () => {
      const sample = {
        id: 1,
        attachments: [{ id: 99, is_new: false, is_deleted: false, updatedAnnotation: '<svg></svg>' }],
        container: emptyContainer(),
        serialize: () => ({}),
      };

      await SamplesFetcher.update(sample);

      sinon.assert.calledOnce(updateAnnotationsStub);
      sinon.assert.calledWith(updateAnnotationsStub, sample);
    });
  });

  describe('ScreensFetcher.update', () => {
    beforeEach(() => {
      sinon.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
      sinon.stub(ScreensFetcher, 'fetchById').resolves({});
      fetchStub = makeFetchStub({ screen: { id: 1 } });
    });

    it('calls updateAnnotations so element-level attachment annotations are saved', async () => {
      const screen = {
        id: 1,
        attachments: [{ id: 99, is_new: false, is_deleted: false, updatedAnnotation: '<svg></svg>' }],
        container: emptyContainer(),
        serialize: () => ({}),
      };

      await ScreensFetcher.update(screen);

      sinon.assert.calledOnce(updateAnnotationsStub);
      sinon.assert.calledWith(updateAnnotationsStub, screen);
    });
  });

  describe('ReactionsFetcher.update', () => {
    let updateOfAttachmentsStub;

    beforeEach(() => {
      sinon.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
      sinon.stub(ReactionsFetcher, 'fetchById').resolves({});
      fetchStub = makeFetchStub({ reaction: { id: 1 } });
      // For Reaction the fix uses updateAnnotationsOfAttachments directly (not updateAnnotations)
      // restore the blanket stub and use the already-stubbed individual methods
      updateOfAttachmentsStub = AnnotationsFetcher.updateAnnotationsOfAttachments;
    });

    it('calls updateAnnotationsOfAttachments for element-level attachments', async () => {
      const reaction = {
        id: 1,
        attachments: [{ id: 99, is_new: false, is_deleted: false, updatedAnnotation: '<svg></svg>' }],
        container: emptyContainer(),
        products: [],
        serialize: () => ({}),
      };

      await ReactionsFetcher.update(reaction);

      sinon.assert.calledWith(updateOfAttachmentsStub, reaction);
    });

    it('still calls updateAnnotationsInReaction so analysis container annotations are not lost', async () => {
      const updateInReactionSpy = sinon.spy(ReactionsFetcher, 'updateAnnotationsInReaction');
      const reaction = {
        id: 1,
        attachments: [],
        container: emptyContainer(),
        products: [],
        serialize: () => ({}),
      };

      await ReactionsFetcher.update(reaction);

      sinon.assert.calledOnce(updateInReactionSpy);
      sinon.assert.calledWith(updateInReactionSpy, reaction);
    });
  });

  describe('CellLinesFetcher.update', () => {
    beforeEach(() => {
      sinon.stub(CellLinesFetcher, 'fetchById').resolves({});
      fetchStub = makeFetchStub({});
    });

    it('calls updateAnnotations so element-level attachment annotations are saved', async () => {
      const cellLineItem = {
        id: 1,
        attachments: [{ id: 99, is_new: false, is_deleted: false, updatedAnnotation: '<svg></svg>' }],
        container: emptyContainer(),
        amount: 1,
        unit: 'ml',
        passage: 0,
        contamination: '',
      };

      await CellLinesFetcher.update(cellLineItem);

      sinon.assert.calledOnce(updateAnnotationsStub);
      sinon.assert.calledWith(updateAnnotationsStub, cellLineItem);
    });
  });
});
