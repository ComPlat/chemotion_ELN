# frozen_string_literal: true

# rubocop: disable RSpec/NestedGroups
# rubocop: disable RSpec/AnyInstance
# rubocop: disable RSpec/LetSetup
# rubocop: disable RSpec/FilePath
# rubocop: disable RSpec/IndexedLet, Lint/RedundantCopDisableDirective, RSpec/Rails/HaveHttpStatus

require 'rails_helper'

describe Chemotion::ElementAPI do
  let(:user) { create(:user) }
  let!(:collection) { create(:collection, user_id: user.id) }

  describe 'DELETE /api/v1/ui_state' do
    let!(:cell_line_sample1) { create(:cellline_sample, collections: [collection, collection2]) }
    let!(:cell_line_sample2) { create(:cellline_sample, collections: [collection, collection2]) }
    let!(:collection2) { create(:collection, user_id: user.id) }

    context 'with user with delete access is logged in,' do
      before do
        allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
        delete '/api/v1/ui_state/', params: params.to_json, headers: { 'CONTENT_TYPE' => 'application/json' }
      end

      context 'when one cell line should be removed from the eln:' do
        let(:params) do
          {
            cell_line: { checkedIds: [cell_line_sample1.id] },
            options: {},
            selecteds: [],
            currentCollection: { id: collection.id },
          }
        end

        it 'only one cell line remains in eln' do
          expect(CelllineSample.find_by(id: cell_line_sample1.id)).to be_nil
          expect(CelllineSample.count).to be 1
        end

        it 'all links between collections and cell lines are removed' do
          expect(CollectionsCellline.find_by(cellline_sample_id: cell_line_sample1.id)).to be_nil
        end

        it 'cell line material still remains in eln' do
          expect(CelllineMaterial.find(cell_line_sample1.cellline_material_id)).not_to be_nil
        end

        it 'returned correct response code' do
          expect(response.code).to eq '200'
        end
      end

      context 'when all cell lines should be removed from the eln' do
        let(:params) do
          {
            cell_line: { checkedAll: true },
            options: {},
            selecteds: [],
            currentCollection: { id: collection.id },
          }
        end

        it 'no cell line remains in eln' do
          expect(CelllineSample.count).to be 0
        end

        it 'all links between collections and cell lines are removed' do
          expect(CollectionsCellline.count).to be 0
        end

        it 'cell line material still remains in eln' do
          expect(CelllineMaterial.find(cell_line_sample1.cellline_material_id)).not_to be_nil
        end

        it 'returned correct response code' do
          expect(response.code).to eq '200'
        end
      end
    end
  end

  context 'when authorized user logged in' do
    let!(:s1)   { create(:sample, collections: [collection]) }
    let!(:r1)   { create(:reaction, collections: [collection]) }

    let(:params) do
      {
        sample: { checkedIds: [s1.id] },
        reaction: { checkedIds: [r1.id] },
        currentCollection: { id: collection.id },
      }
    end

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/ui_state w currentCollection params' do
      before { post '/api/v1/ui_state/', params: params.to_json, headers: { 'CONTENT_TYPE' => 'application/json' } }

      it 'returns selected list content' do
        response_samples = JSON.parse(response.body)['samples']
        response_reactions = JSON.parse(response.body)['reactions']
        expect(response_samples.first['id']).to eq s1.id
        expect(response_reactions.first['id']).to eq r1.id
      end
    end
  end
end

# rubocop: enable RSpec/NestedGroups
# rubocop: enable RSpec/AnyInstance
# rubocop: enable RSpec/LetSetup
# rubocop: enable RSpec/FilePath
# rubocop: enable RSpec/IndexedLet, Lint/RedundantCopDisableDirective, RSpec/Rails/HaveHttpStatus
