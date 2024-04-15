# frozen_string_literal: true

# rubocop:disable RSpec/LetSetup
# rubocop:disable RSpec/FilePath,RSpec/MultipleMemoizedHelpers, RSpec/NestedGroups

require 'rails_helper'

describe Chemotion::LiteratureAPI do
  include_context 'api request authorization context'
  let!(:user) { create(:person) }
  let!(:collection) { create(:collection, user: user) }
  let!(:r1) { create(:reaction, creator: user, collections: [collection]) }
  let!(:l1) { create(:literature) }
  let!(:l2) { create(:literature) }
  let!(:lt1) { create(:literal, literature: l1, element: r1, user: user) }
  let!(:lt2) { create(:literal, literature: l2, element: r1, user: user) }
  let!(:params_element_id) { r1.id }
  let!(:element_type) { 'reaction' }
  let!(:is_new) { true }
  let!(:doi) { nil }
  let!(:url) { 'test' }
  let!(:title) { 'testpost' }
  let!(:params) do
    {
      element_id: params_element_id,
      element_type: element_type,
      ref: {
        is_new: is_new,
        title: title,
        url: url,
        doi: doi,
        id: l1.id,
      },
    }
  end

  describe 'GET /api/v1/literatures' do
    context 'with valid parameters' do
      before do
        get '/api/v1/literatures', params: { element_id: r1.id, element_type: 'reaction' }
      end

      it 'responds 200' do
        expect(response).to have_http_status :ok
      end

      it 'is able to get literatures by reaction Id' do
        literatures = JSON.parse(response.body)['literatures']
        expect(literatures.first.symbolize_keys).to include(
          id: l1.id,
          title: l1.title,
          url: l1.url,
        )
        expect(literatures.last.symbolize_keys).to include(
          id: l2.id,
          title: l2.title,
          url: l2.url,
        )
      end
    end

    context 'when fetching literature from a cell line' do
      let!(:cell_line) { create(:cellline_sample, collections: [collection]) }
      let!(:cell_line_literal) do
        create(:literal,
               literature: l1,
               element: cell_line.cellline_material,
               user: user)
      end

      before do
        get '/api/v1/literatures', params: { element_id: cell_line.id, element_type: 'cell_line' }
      end

      it 'response code is 200' do
        expect(response).to have_http_status :ok
      end

      it 'literature was returned correct' do
        literatures = JSON.parse(response.body)['literatures']
        expect(literatures.count).to be 1
        expect(literatures.first['id']).to be l1.id
      end
    end
  end

  describe 'POST /api/v1/literatures' do
    context 'when adding literature to a cell line' do
      let!(:cell_line) { create(:cellline_sample, cellline_material: cellline_material, collections: [collection]) }
      let!(:params_element_id) { cell_line.id }
      let!(:element_type) { 'cell_line' }

      context 'when literature is not in database' do
        let!(:cellline_material) { create(:cellline_material, source: 'XYZ') }

        before do
          post '/api/v1/literatures', params: params
        end

        it 'responds 201' do
          expect(response).to have_http_status :created
        end

        it 'literal was attached to cell line' do
          expect(cell_line.reload.cellline_material.literatures.count).to be 1
        end
      end

      context 'when literature is new but already in database' do
        let!(:cellline_material) { create(:cellline_material, source: 'XYZ') }
        let!(:literatures_count) { Literature.count }
        let!(:url) { l1.url }
        let!(:title) { l1.title }
        let!(:doi) { l1.doi }

        before do
          post '/api/v1/literatures', params: params
        end

        it 'responds 201' do
          expect(response).to have_http_status :created
        end

        it 'literature was not created again' do
          expect(Literature.count).to be literatures_count
        end

        it 'literal again attached to cell line' do
          expect(cell_line.reload.cellline_material.literatures.count).to eq 1
        end
      end

      context 'when literature is not new' do
        let!(:literatures_count) { Literature.count }
        let!(:cellline_material) { create(:cellline_material, source: 'ABC') }
        let!(:is_new) { false }

        before do
          post '/api/v1/literatures', params: params
        end

        it 'responds 201' do
          expect(response).to have_http_status :created
        end

        it 'literature was not created again' do
          expect(Literature.count).to be literatures_count
        end

        it 'literal again attached to cell line' do
          expect(cell_line.reload.cellline_material.literatures.count).to eq 1
        end
      end
    end

    context 'with valid parameters' do
      before { post '/api/v1/literatures', params: params }

      it 'responds 201' do
        expect(response).to have_http_status :created
      end

      it 'is able to create a new literature' do
        l = params[:element_type]
            .classify
            .constantize
            .find(params[:element_id])
            .literatures.find_by(title: 'testpost')
        expect(l).not_to be_nil
      end
    end
  end

  describe 'DELETE /api/v1/literatures' do
    let!(:element_id) { -1 }
    let(:params) do
      {
        element_id: element_id,
        element_type: 'reaction',
        id: literal.id,
      }
    end

    context 'with valid parameter' do
      let!(:literal) { create(:literal, literature: l1, element: r1, user: user) }
      let!(:element_id) { r1.id }

      before do
        delete '/api/v1/literatures', params: params
      end

      it 'response status code is 200' do
        expect(response).to have_http_status :ok
      end

      it 'literal was removed' do
        expect(Literal.find_by(id: literal.id)).to be_nil
      end
    end
  end

  describe 'PUT /api/v1/literatures' do
    context 'when changing the category of the literal of a cell line' do
      let!(:cell_line) { create(:cellline_sample, collections: [collection]) }
      let!(:cell_line_literal) do
        create(:literal,
               literature: l1,
               element: cell_line.cellline_material,
               user: user)
      end

      before do
        put '/api/v1/literatures',
            params: { id: cell_line_literal.id,
                      litype: 'additionalLiterature',
                      element_type: 'cell_line',
                      element_id: cell_line.id }
      end

      it 'return correct status code' do
        expect(response).to have_http_status :ok
      end

      it 'literature type was changed' do
        expect(cell_line.reload.cellline_material.literals.first.litype).to eq 'additionalLiterature'
      end
    end
  end
end
# rubocop:enable RSpec/LetSetup
# rubocop:enable RSpec/FilePath,RSpec/MultipleMemoizedHelpers, RSpec/NestedGroups
