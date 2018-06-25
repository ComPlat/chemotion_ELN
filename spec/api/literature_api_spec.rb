require 'rails_helper'

describe Chemotion::LiteratureAPI do

  context 'authorized user logged in' do
    let(:user)  { create(:person) }
    let!(:collection) { create(:collection, user: user)}
    let!(:r1)    { create(:reaction, creator: user, collections: [collection]) }
    let!(:l1)    { create(:literature)}
    let!(:l2)    { create(:literature)}
    let!(:lt1)    { create(:literal, literature: l1, element: r1, user: user)}
    let!(:lt2)    { create(:literal, literature: l2, element: r1, user: user)}
    let!(:params) {
      {
        element_id: r1.id,
        element_type: 'reaction',
        ref: {
          is_new: true,
          title: 'testpost',
          url: 'test'
        }
      }
    }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/literatures' do
      context 'with valid parameters' do
        before do
          get '/api/v1/literatures', { element_id: r1.id, element_type: 'reaction' }
        end

        it 'responds 200' do
          expect(response.status).to be 200
        end

        it 'should be able to get literatures by reaction Id' do
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
    end

    describe 'POST /api/v1/literatures' do
      context 'with valid parameters' do
        before { post '/api/v1/literatures', params }

        it 'responds 201' do
          expect(response.status).to be 201
        end

        it 'should be able to create a new literature' do
          l = params[:element_type].classify.constantize.find(params[:element_id]).literatures.find_by(title: 'testpost')
          expect(l).to_not be_nil
        end
      end
    end

    # describe 'DELETE /api/v1/literatures' do
    #   context 'with valid parameters' do
    #
    #     let!(:params) {
    #       {
    #         reaction_id: r1.id,
    #         title: 'testdelete',
    #         url: 'test'
    #       }
    #     }
    #
    #     it 'should be able to delete a literature' do
    #       post '/api/v1/literatures', params
    #       l = Literature.find_by(title: 'testdelete')
    #       expect(l).to_not be_nil
    #       delete '/api/v1/literatures', { id: l.id }
    #       l = Literature.find_by(title: 'testdelte')
    #       expect(l).to be_nil
    #     end
    #   end
    # end

  end
end
