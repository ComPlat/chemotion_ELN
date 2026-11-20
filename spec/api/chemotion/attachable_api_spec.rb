# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AttachableAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }

  def post_update(attachable_type:, attachable_id:, del_files: [])
    params = { attachable_type: attachable_type, attachable_id: attachable_id }
    params[:del_files] = del_files unless del_files.empty?
    post '/api/v1/attachable/update_attachments_attachable', params: params
  end

  context 'with attachable_type Sample' do
    let(:sample) { create(:sample, collections: [collection]) }

    context 'when the sample belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'Sample', attachable_id: sample.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: sample)
        post_update(attachable_type: 'Sample', attachable_id: sample.id, del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end

      it 'does not nullify attachments belonging to a different sample' do
        other_sample = create(:sample, collections: [create(:collection, user: create(:person))])
        other_attachment = create(:attachment, attachable: other_sample)
        post_update(attachable_type: 'Sample', attachable_id: sample.id, del_files: [other_attachment.id])
        expect(Attachment.unscoped.find(other_attachment.id).attachable_id).to eq(other_sample.id)
      end
    end

    context 'when the sample belongs to another user' do
      let(:other_collection) { create(:collection, user: create(:person)) }
      let(:other_sample) { create(:sample, collections: [other_collection]) }

      it 'returns 401' do
        post_update(attachable_type: 'Sample', attachable_id: other_sample.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the sample does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'Sample', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type Reaction' do
    let(:reaction) { create(:reaction) }

    before { CollectionsReaction.create!(collection: collection, reaction: reaction) }

    context 'when the reaction belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'Reaction', attachable_id: reaction.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: reaction)
        post_update(attachable_type: 'Reaction', attachable_id: reaction.id, del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end
    end

    context 'when the reaction belongs to another user' do
      let(:other_reaction) { create(:reaction) }
      let(:other_collection) { create(:collection, user: create(:person)) }

      before { CollectionsReaction.create!(collection: other_collection, reaction: other_reaction) }

      it 'returns 401' do
        post_update(attachable_type: 'Reaction', attachable_id: other_reaction.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the reaction does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'Reaction', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type Screen' do
    let(:screen) { create(:screen) }

    before { CollectionsScreen.create!(collection: collection, screen: screen) }

    context 'when the screen belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'Screen', attachable_id: screen.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: screen)
        post_update(attachable_type: 'Screen', attachable_id: screen.id, del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end
    end

    context 'when the screen belongs to another user' do
      let(:other_screen) { create(:screen) }
      let(:other_collection) { create(:collection, user: create(:person)) }

      before { CollectionsScreen.create!(collection: other_collection, screen: other_screen) }

      it 'returns 401' do
        post_update(attachable_type: 'Screen', attachable_id: other_screen.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the screen does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'Screen', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type CelllineSample' do
    let(:cellline_material) { create(:cellline_material) }
    let(:cellline) { create(:cellline_sample, creator: user, cellline_material: cellline_material) }

    before { CollectionsCellline.create!(collection: collection, cellline_sample: cellline) }

    context 'when the cellline belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'CelllineSample', attachable_id: cellline.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: cellline)
        post_update(attachable_type: 'CelllineSample', attachable_id: cellline.id, del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end
    end

    context 'when the cellline belongs to another user' do
      let(:other_user) { create(:person) }
      let(:other_cellline) { create(:cellline_sample, creator: other_user, cellline_material: cellline_material) }
      let(:other_collection) { create(:collection, user: other_user) }

      before { CollectionsCellline.create!(collection: other_collection, cellline_sample: other_cellline) }

      it 'returns 401' do
        post_update(attachable_type: 'CelllineSample', attachable_id: other_cellline.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the cellline does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'CelllineSample', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type Wellplate' do
    let(:wellplate) { create(:wellplate) }

    before { CollectionsWellplate.create!(collection: collection, wellplate: wellplate) }

    context 'when the wellplate belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'Wellplate', attachable_id: wellplate.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: wellplate)
        post_update(attachable_type: 'Wellplate', attachable_id: wellplate.id, del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end

      # del_files is the frontend's delete path: a deleted file must not show up in the inbox.
      it "keeps deleted attachments out of the uploader's Unsorted inbox" do
        attachment = create(:attachment, attachable: wellplate)
        post_update(attachable_type: 'Wellplate', attachable_id: wellplate.id, del_files: [attachment.id])
        expect(attachment.reload.attachable_type).to eq('Wellplate')
        expect(Attachment.where(attachable_type: 'Container', attachable_id: nil)).not_to include(attachment)
      end
    end

    context 'when the wellplate belongs to another user' do
      let(:other_wellplate) { create(:wellplate) }
      let(:other_collection) { create(:collection, user: create(:person)) }

      before { CollectionsWellplate.create!(collection: other_collection, wellplate: other_wellplate) }

      it 'returns 401' do
        post_update(attachable_type: 'Wellplate', attachable_id: other_wellplate.id)
        expect(response.status).to eq(401)
      end

      it 'leaves attachment linked when deletion is rejected' do
        attachment = create(:attachment, attachable: other_wellplate)
        post_update(attachable_type: 'Wellplate', attachable_id: other_wellplate.id, del_files: [attachment.id])
        expect(attachment.reload.attachable_id).to eq(other_wellplate.id)
      end
    end

    context 'when the wellplate does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'Wellplate', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type ResearchPlan' do
    let(:research_plan) { create(:research_plan) }

    before { CollectionsResearchPlan.create!(collection: collection, research_plan: research_plan) }

    context 'when the research plan belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'ResearchPlan', attachable_id: research_plan.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: research_plan)
        post_update(attachable_type: 'ResearchPlan', attachable_id: research_plan.id, del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end
    end

    context 'when the research plan belongs to another user' do
      let(:other_research_plan) { create(:research_plan) }
      let(:other_collection) { create(:collection, user: create(:person)) }

      before { CollectionsResearchPlan.create!(collection: other_collection, research_plan: other_research_plan) }

      it 'returns 401' do
        post_update(attachable_type: 'ResearchPlan', attachable_id: other_research_plan.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the research plan does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'ResearchPlan', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type DeviceDescription' do
    let(:device_description) { create(:device_description, creator: user) }

    before { CollectionsDeviceDescription.create!(collection: collection, device_description: device_description) }

    context 'when the device description belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'DeviceDescription', attachable_id: device_description.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: device_description)
        post_update(attachable_type: 'DeviceDescription', attachable_id: device_description.id,
                    del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end
    end

    context 'when the device description belongs to another user' do
      let(:other_user) { create(:person) }
      let(:other_device_description) { create(:device_description, creator: other_user) }
      let(:other_collection) { create(:collection, user: create(:person)) }

      before do
        CollectionsDeviceDescription.create!(collection: other_collection,
                                             device_description: other_device_description)
      end

      it 'returns 401' do
        post_update(attachable_type: 'DeviceDescription', attachable_id: other_device_description.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the device description does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'DeviceDescription', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type SequenceBasedMacromoleculeSample' do
    let(:sbmm) { create(:uniprot_sbmm) }
    let(:sbmm_sample) { create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user) }

    before do
      CollectionsSequenceBasedMacromoleculeSample.create!(collection: collection,
                                                          sequence_based_macromolecule_sample: sbmm_sample)
    end

    context 'when the sample belongs to the current user' do
      it 'returns 200' do
        post_update(attachable_type: 'SequenceBasedMacromoleculeSample', attachable_id: sbmm_sample.id)
        expect(response.status).to be_between(200, 299)
      end

      it 'nullifies requested attachment records' do
        attachment = create(:attachment, attachable: sbmm_sample)
        post_update(attachable_type: 'SequenceBasedMacromoleculeSample', attachable_id: sbmm_sample.id,
                    del_files: [attachment.id])
        expect(Attachment.unscoped.find(attachment.id).attachable_id).to be_nil
      end
    end

    context 'when the sample belongs to another user' do
      let(:other_user) { create(:person) }
      let(:other_sample) do
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: other_user)
      end
      let(:other_collection) { create(:collection, user: other_user) }

      before do
        CollectionsSequenceBasedMacromoleculeSample.create!(collection: other_collection,
                                                            sequence_based_macromolecule_sample: other_sample)
      end

      it 'returns 401' do
        post_update(attachable_type: 'SequenceBasedMacromoleculeSample', attachable_id: other_sample.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the sample does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'SequenceBasedMacromoleculeSample', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end
  end

  context 'with attachable_type SequenceBasedMacromolecule' do
    let(:sbmm) { create(:uniprot_sbmm) }
    let(:sbmm_sample) { create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user) }

    before do
      CollectionsSequenceBasedMacromoleculeSample.create!(collection: collection,
                                                          sequence_based_macromolecule_sample: sbmm_sample)
    end

    context 'when the macromolecule is reachable through a sample in the user collection' do
      it 'returns 200' do
        post_update(attachable_type: 'SequenceBasedMacromolecule', attachable_id: sbmm.id)
        expect(response.status).to be_between(200, 299)
      end
    end

    context 'when the macromolecule is not linked to any of the user collections' do
      let(:other_sbmm) { create(:uniprot_sbmm) }

      it 'returns 401' do
        post_update(attachable_type: 'SequenceBasedMacromolecule', attachable_id: other_sbmm.id)
        expect(response.status).to eq(401)
      end
    end

    context 'when the macromolecule does not exist' do
      it 'returns 401' do
        post_update(attachable_type: 'SequenceBasedMacromolecule', attachable_id: 0)
        expect(response.status).to eq(401)
      end
    end

    # Regression: ElementPolicy derived the detail-level column from the record class, and there
    # is no sequencebasedmacromolecule_detail_level column, so a sharee saving an SBMM with
    # attachments got a 500 (PG::UndefinedColumn) instead of the upload succeeding.
    context 'when its sample is shared with edit rights' do
      let(:other_user) { create(:person) }
      let(:other_collection) { create(:collection, user: other_user) }

      before do
        create(:collection_share, collection: other_collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:edit_elements))
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: other_user,
                                                     collections: [other_collection])
      end

      it 'returns 200 (not 500)' do
        post_update(attachable_type: 'SequenceBasedMacromolecule', attachable_id: sbmm.id)
        expect(response.status).to be_between(200, 299)
      end
    end

    # An SBMM is reused across users (Usecases::Sbmm::Finder), so it is a shared record: once another
    # user has a sample of it, a user detaches only their own uploads on it.
    context 'when detaching and another user also has a sample of the same SBMM' do
      let(:other_user) { create(:person) }
      let(:other_collection) { create(:collection, user: other_user) }
      let!(:own_attachment) { create(:attachment, attachable: sbmm, created_for: user.id) }
      let!(:foreign_attachment) { create(:attachment, attachable: sbmm, created_for: other_user.id) }

      before do
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: other_user,
                                                     collections: [other_collection])
      end

      it "detaches only the caller's own upload" do
        post_update(attachable_type: 'SequenceBasedMacromolecule', attachable_id: sbmm.id,
                    del_files: [own_attachment.id, foreign_attachment.id])
        expect(own_attachment.reload.attachable_id).to be_nil
        expect(foreign_attachment.reload.attachable_id).to eq(sbmm.id)
      end
    end

    context 'when detaching and no other user has a sample of the SBMM' do
      let(:other_user) { create(:person) }
      let!(:attachment) { create(:attachment, attachable: sbmm, created_for: other_user.id) }

      it 'detaches regardless of who uploaded it' do
        post_update(attachable_type: 'SequenceBasedMacromolecule', attachable_id: sbmm.id,
                    del_files: [attachment.id])
        expect(attachment.reload.attachable_id).to be_nil
      end
    end
  end

  # del_files only unlinks attachments of the record authorized by after_validation (type and id).
  %w[ResearchPlan Wellplate].each do |type|
    context "with attachable_type #{type}: del_files does not cross element boundaries" do
      let(:other_user) { create(:person) }
      let(:other_collection) { create(:collection, user: other_user) }
      let(:own_element) { create(type.underscore.to_sym, collections: [collection]) }
      let(:other_element) { create(type.underscore.to_sym, collections: [other_collection]) }
      let!(:own_attachment) { create(:attachment, attachable: own_element) }
      let!(:other_attachment) { create(:attachment, attachable: other_element) }

      it 'unlinks only the attachment of the authorized record' do
        post_update(attachable_type: type, attachable_id: own_element.id,
                    del_files: [own_attachment.id, other_attachment.id])
        expect(response.status).to be_between(200, 299)
        expect(own_attachment.reload.attachable_id).to be_nil
        expect(other_attachment.reload).to have_attributes(attachable_type: type, attachable_id: other_element.id)
      end
    end
  end

  context 'with a missing or unknown attachable_type' do
    it 'returns 400 for an unknown type' do
      post_update(attachable_type: 'UnknownType', attachable_id: 1)
      expect(response.status).to eq(400)
    end

    it 'returns 400 when attachable_type is missing' do
      post '/api/v1/attachable/update_attachments_attachable', params: { attachable_id: 1 }
      expect(response.status).to eq(400)
    end
  end
end
