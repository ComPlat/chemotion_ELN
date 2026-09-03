# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AttachableAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:other_collection) { create(:collection, user: other_user) }

  let(:params) do
    {
      files: [fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain')],
      attfilesIdentifier: ['upload.txt'],
      attachable_type: attachable_type,
      attachable_id: attachable_id,
    }
  end

  describe 'POST /api/v1/attachable/update_attachments_attachable' do
    context 'when attachable_type is not a recognized element type' do
      let(:attachable_type) { 'Container' }
      let(:attachable_id) { 0 }

      before { post '/api/v1/attachable/update_attachments_attachable', params: params }

      it 'is rejected as unauthorized and creates no attachment' do
        expect(response).to have_http_status(:unauthorized)
        expect(Attachment.count).to eq(0)
      end
    end

    context 'when attachable_type is ResearchPlan and it is in the current user\'s own collection' do
      let(:attachable_type) { 'ResearchPlan' }
      let(:attachable_id) { research_plan.id }
      let(:research_plan) { create(:research_plan, collections: [collection]) }

      before { post '/api/v1/attachable/update_attachments_attachable', params: params }

      it 'attaches the file to the research plan' do
        expect(response).to have_http_status(:created)
        expect(Attachment.count).to eq(1)
        expect(Attachment.last).to have_attributes(
          attachable_type: 'ResearchPlan', attachable_id: research_plan.id, filename: 'upload.txt',
        )
      end
    end

    context 'when attachable_type is ResearchPlan and it belongs to another user' do
      let(:attachable_type) { 'ResearchPlan' }
      let(:attachable_id) { research_plan.id }
      let(:research_plan) { create(:research_plan, collections: [other_collection]) }

      before { post '/api/v1/attachable/update_attachments_attachable', params: params }

      it 'is rejected as unauthorized and creates no attachment' do
        expect(response).to have_http_status(:unauthorized)
        expect(Attachment.count).to eq(0)
      end
    end

    # Regression: authorization used to only run for attachable_type == 'ResearchPlan'; every
    # other type (Wellplate, DeviceDescription, sbmm samples/macromolecules) let any authenticated
    # user attach files to, or detach attachments from, elements they had no access to.
    context 'when attachable_type is Wellplate and it is in the current user\'s own collection' do
      let(:attachable_type) { 'Wellplate' }
      let(:attachable_id) { wellplate.id }
      let(:wellplate) { create(:wellplate, collections: [collection]) }

      before { post '/api/v1/attachable/update_attachments_attachable', params: params }

      it 'attaches the file to the wellplate' do
        expect(response).to have_http_status(:created)
        expect(Attachment.count).to eq(1)
        expect(Attachment.last).to have_attributes(attachable_type: 'Wellplate', attachable_id: wellplate.id)
      end
    end

    context 'when attachable_type is Wellplate and it belongs to another user' do
      let(:attachable_type) { 'Wellplate' }
      let(:attachable_id) { wellplate.id }
      let(:wellplate) { create(:wellplate, collections: [other_collection]) }

      before { post '/api/v1/attachable/update_attachments_attachable', params: params }

      it 'is rejected as unauthorized and creates no attachment' do
        expect(response).to have_http_status(:unauthorized)
        expect(Attachment.count).to eq(0)
      end
    end

    context 'when deleting an attachment from a wellplate in the current user\'s own collection' do
      let(:attachable_type) { 'Wellplate' }
      let(:attachable_id) { wellplate.id }
      let(:wellplate) { create(:wellplate, collections: [collection]) }
      let!(:attachment) { create(:attachment, attachable: wellplate) }
      let(:params) do
        { attachable_type: attachable_type, attachable_id: attachable_id, del_files: [attachment.id] }
      end

      before { post '/api/v1/attachable/update_attachments_attachable', params: params }

      it 'unlinks the attachment' do
        expect(response).to have_http_status(:created)
        expect(attachment.reload.attachable_id).to be_nil
      end
    end

    context 'when deleting an attachment from a wellplate belonging to another user' do
      let(:attachable_type) { 'Wellplate' }
      let(:attachable_id) { wellplate.id }
      let(:wellplate) { create(:wellplate, collections: [other_collection]) }
      let!(:attachment) { create(:attachment, attachable: wellplate) }
      let(:params) do
        { attachable_type: attachable_type, attachable_id: attachable_id, del_files: [attachment.id] }
      end

      before { post '/api/v1/attachable/update_attachments_attachable', params: params }

      it 'is rejected as unauthorized and leaves the attachment linked' do
        expect(response).to have_http_status(:unauthorized)
        expect(attachment.reload.attachable_id).to eq(wellplate.id)
      end
    end
  end
end
