# frozen_string_literal: true

# rubocop:disable RSpec/LetSetup
# rubocop:disable RSpec/FilePath

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
  let!(:params) do
    {
      element_id: r1.id,
      element_type: 'reaction',
      ref: {
        is_new: true,
        title: 'testpost',
        url: 'test',
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
      let!(:literal)    { create(:literal, literature: l1, element: r1, user: user) }
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
end
# rubocop:enable RSpec/LetSetup
# rubocop:enable RSpec/FilePath
