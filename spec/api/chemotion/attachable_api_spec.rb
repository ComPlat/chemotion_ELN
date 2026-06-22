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

  context 'with an unknown attachable_type' do
    it 'passes through without a 401 (no auth check for unknown types)' do
      post_update(attachable_type: 'UnknownType', attachable_id: 1)
      expect(response.status).not_to eq(401)
    end
  end
end
