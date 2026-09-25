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

    # Regression: ElementPolicy derived the detail-level column from the record class, and there
    # is no sequencebasedmacromolecule_detail_level column, so a sharee saving an SBMM with
    # attachments got a 500 (PG::UndefinedColumn) instead of the upload succeeding.
    context 'when attachable_type is SequenceBasedMacromolecule and its sample is shared with edit rights' do
      let(:attachable_type) { 'SequenceBasedMacromolecule' }
      let(:attachable_id) { sbmm.id }
      let(:sbmm) { create(:uniprot_sbmm) }

      before do
        create(:collection_share, collection: other_collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:edit_elements))
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: other_user,
                                                     collections: [other_collection])
        post '/api/v1/attachable/update_attachments_attachable', params: params
      end

      it 'attaches the file to the sbmm' do
        expect(response).to have_http_status(:created)
        expect(Attachment.last).to have_attributes(
          attachable_type: 'SequenceBasedMacromolecule', attachable_id: sbmm.id,
        )
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

    # Regression: the detach query filtered del_files by attachable_type only, never by the
    # attachable_id that after_validation had just authorized. Passing an attachable_id the caller
    # owns together with another user's attachment ids therefore detached the victim's files.
    %w[ResearchPlan Wellplate].each do |type|
      context "when del_files targets another user's #{type} attachment but attachable_id is the caller's own" do
        let(:attachable_type) { type }
        let(:attachable_id) { own_element.id }
        let(:own_element) { create(type.underscore.to_sym, collections: [collection]) }
        let(:victim_element) { create(type.underscore.to_sym, collections: [other_collection]) }
        let!(:own_attachment) { create(:attachment, attachable: own_element) }
        let!(:victim_attachment) { create(:attachment, attachable: victim_element) }
        let(:params) do
          {
            attachable_type: attachable_type,
            attachable_id: attachable_id,
            del_files: [own_attachment.id, victim_attachment.id],
          }
        end

        before { post '/api/v1/attachable/update_attachments_attachable', params: params }

        it "detaches only the caller's own attachment and leaves the victim's linked" do
          expect(response).to have_http_status(:created)
          expect(own_attachment.reload.attachable_id).to be_nil
          expect(victim_attachment.reload).to have_attributes(attachable_type: type, attachable_id: victim_element.id)
        end
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
