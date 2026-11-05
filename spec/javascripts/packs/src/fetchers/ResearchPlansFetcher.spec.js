/* global describe, it, beforeEach, afterEach */

import expect from 'expect';
import sinon from 'sinon';
import { addMiddleware } from 'mobx-state-tree';

import ApiClient from 'src/api_clients/ChemotionApiClient';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import ResearchPlan from 'src/models/ResearchPlan';
import ImageFileDropHandler from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';
import { rootStore } from 'src/stores/mobx/RootStore';

describe('ResearchPlansFetcher.create', () => {
  let sandbox;
  let plan;
  let response;
  let post;
  let notify;
  let stopNotifications;
  let uploadAttachments;
  let uploadGenericFiles;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    plan = ResearchPlan.buildEmpty(12);
    response = {
      research_plan: { id: 200, name: 'Copied plan', body: [] },
      attachments: [{ id: 301, filename: 'Copied image.png' }],
    };
    post = sandbox.stub(ApiClient, 'postJson').resolves(response);
    sandbox.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
    uploadAttachments = sandbox.stub(AttachmentFetcher, 'updateAttachables').resolves();
    uploadGenericFiles = sandbox.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
    notify = sandbox.spy();
    stopNotifications = addMiddleware(rootStore.notificationsStore, (call, next, abort) => {
      if (call.name === 'add') {
        notify(...call.args);
        abort(undefined);
      } else {
        next(call);
      }
    });
  });

  afterEach(() => {
    stopNotifications();
    sandbox.restore();
  });

  it('warns once about omitted attachments and returns the saved plan after uploads finish', async () => {
    response.attachments_omitted = true;

    const saved = await ResearchPlansFetcher.create(plan);

    sinon.assert.calledOnceWithExactly(notify, {
      message: 'Research plan created, but some attachments could not be copied and were omitted.',
      level: 'warning',
      autoDismiss: 0,
    });
    sinon.assert.calledOnceWithExactly(uploadAttachments, [], 'ResearchPlan', 200, []);
    sinon.assert.calledOnceWithExactly(uploadGenericFiles, plan, 200, 'ResearchPlan', true);
    sinon.assert.callOrder(post, uploadAttachments, uploadGenericFiles, notify);
    expect(saved).toBeInstanceOf(ResearchPlan);
    expect(saved.id).toEqual(200);
    expect(saved.attachments).toEqual(response.attachments);
  });

  it('waits for pending uploads before showing the warning', async () => {
    response.attachments_omitted = true;
    let finishUpload;
    uploadGenericFiles.callsFake(() => new Promise((resolve) => { finishUpload = resolve; }));
    const creating = ResearchPlansFetcher.create(plan);
    await new Promise((resolve) => setTimeout(resolve, 0));

    sinon.assert.notCalled(notify);
    finishUpload();
    await creating;

    sinon.assert.calledOnce(notify);
  });

  it('does not warn when the response contains no omissions', async () => {
    const saved = await ResearchPlansFetcher.create(plan);

    sinon.assert.notCalled(notify);
    expect(saved.id).toEqual(200);
  });

  it('does not warn when the omission flag is false', async () => {
    response.attachments_omitted = false;

    await ResearchPlansFetcher.create(plan);

    sinon.assert.notCalled(notify);
  });

  it('does not show a copy warning or start follow-up uploads when creation fails', async () => {
    post.rejects(new Error('Creation failed'));

    await expect(ResearchPlansFetcher.create(plan)).rejects.toThrow('Creation failed');

    sinon.assert.notCalled(notify);
    sinon.assert.notCalled(uploadAttachments);
    sinon.assert.notCalled(uploadGenericFiles);
  });

  it('sends the source plan ID when creating a copy', async () => {
    plan.id = 19;
    plan.is_new = false;
    const copy = ResearchPlan.copyFromResearchPlanAndCollectionId(plan, 12);

    await ResearchPlansFetcher.create(copy);

    expect(post.firstCall.args[1].body.source_plan_id).toEqual(19);
  });

  [false, true].forEach((copying) => {
    const scenario = copying ? 'a plan copy' : 'a new plan';
    it(`uploads a dropped image after saving ${scenario} using the same UUID`, async () => {
      if (copying) {
        plan.id = 19;
        plan.is_new = false;
        plan = ResearchPlan.copyFromResearchPlanAndCollectionId(plan, 12);
      }

      sandbox.stub(global, 'FormData').value(window.FormData);
      const uploadRequest = sandbox.stub(ApiClient, 'postFormData').resolves();
      uploadAttachments.resetBehavior();
      uploadAttachments.callThrough();
      const file = new window.File(['pending image'], 'pending.png', { type: 'image/png' });
      const field = { id: 'pending-image', type: 'image', value: {} };
      field.value = new ImageFileDropHandler().handleDrop([file], field, plan.attachments);
      plan.body.push(field);
      const pending = plan.attachments[0];
      let finishCreate;
      post.callsFake(() => new Promise((resolve) => { finishCreate = resolve; }));

      const creating = ResearchPlansFetcher.create(plan);
      await new Promise((resolve) => setTimeout(resolve, 0));

      const payload = JSON.parse(JSON.stringify(post.firstCall.args[1].body));
      expect(payload.body[0].value).toEqual({ file_name: 'pending.png', public_name: pending.id });
      expect(payload.attachments[0]).toMatchObject({ id: pending.id, is_new: true });
      expect(payload.source_plan_id).toEqual(copying ? 19 : undefined);
      sinon.assert.notCalled(uploadRequest);

      finishCreate(response);
      await creating;

      sinon.assert.calledOnce(uploadRequest);
      expect(uploadRequest.firstCall.args[0]).toEqual('/api/v1/attachable/update_attachments_attachable');
      const uploadBody = uploadRequest.firstCall.args[1].body;
      expect(uploadBody.getAll('attfilesIdentifier[]')).toEqual([pending.id]);
      expect(uploadBody.get('attachable_id')).toEqual('200');
      expect(uploadBody.get('files[]').name).toEqual('pending.png');
      sinon.assert.callOrder(post, uploadRequest);
      sinon.assert.notCalled(notify);
    });
  });

  it('reports a rejected source permission and stops without uploading files', async () => {
    post.resolves({ error: '403 Forbidden' });

    await expect(ResearchPlansFetcher.create(plan)).rejects.toThrow('403 Forbidden');

    sinon.assert.calledOnceWithExactly(notify, {
      message: 'Research plan could not be created. Check your source plan and destination collection permissions.',
      level: 'error',
    });
    sinon.assert.notCalled(uploadAttachments);
    sinon.assert.notCalled(uploadGenericFiles);
  });

  [
    { status: 400, error: 'Attachments must be an array of attachment objects' },
    { status: 422, error: 'Unable to copy attachment files' },
  ].forEach(({ status, error }) => {
    it(`shows the server's message for a ${status} response and stops follow-up uploads`, async () => {
      post.callsFake((url, options) => {
        const result = new Response(JSON.stringify({ error }), { status });
        return options.handleResponseSuccess ? options.handleResponseSuccess(result) : result.json();
      });

      await expect(ResearchPlansFetcher.create(plan)).rejects.toThrow(error);

      sinon.assert.calledOnceWithExactly(notify, { message: error, level: 'error' });
      sinon.assert.notCalled(uploadAttachments);
      sinon.assert.notCalled(uploadGenericFiles);
    });
  });

  [
    { status: 500, error: 'Unexpected internal exception' },
    { status: 400, error: { details: 'Unexpected response format' } },
    { status: 422, error: '   ' },
  ].forEach(({ status, error }) => {
    it(`uses a fallback for an unexpected or empty error message (${status}: ${JSON.stringify(error)})`, async () => {
      post.callsFake((url, options) => {
        const result = new Response(JSON.stringify({ error }), { status });
        return options.handleResponseSuccess ? options.handleResponseSuccess(result) : result.json();
      });

      await expect(ResearchPlansFetcher.create(plan)).rejects.toThrow();

      sinon.assert.calledOnceWithExactly(notify, {
        message: 'Research plan could not be created. Please try again.',
        level: 'error',
      });
      sinon.assert.notCalled(uploadAttachments);
      sinon.assert.notCalled(uploadGenericFiles);
    });
  });
});
