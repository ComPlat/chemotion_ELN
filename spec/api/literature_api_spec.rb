# require 'rails_helper'
#
# describe Chemotion::LiteratureAPI do
#
#   context 'authorized user logged in' do
#     let(:user)  { create(:user) }
#     let!(:r1)    { create(:reaction) }
#     let!(:l1)    { create(:literature, reaction_id: r1.id)}
#     let!(:l2)    { create(:literature, reaction_id: r1.id)}
#
#     before do
#       allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
#     end
#
#     describe 'GET /api/v1/literatures' do
#       context 'with valid parameters' do
#
#         it 'should be able to get literatures by reaction Id' do
#           get '/api/v1/literatures', { reaction_id: r1.id }
#           literatures = JSON.parse(response.body)['literatures']
#           expect(literatures.first.symbolize_keys).to include(
#             id: l1.id,
#             title: l1.title,
#             url: l1.url,
#             reaction_id: l1.reaction_id
#           )
#           expect(literatures.last.symbolize_keys).to include(
#             id: l2.id,
#             title: l2.title,
#             url: l2.url,
#             reaction_id: l2.reaction_id
#           )
#         end
#       end
#     end
#
#     describe 'POST /api/v1/literatures' do
#       context 'with valid parameters' do
#
#         let!(:params) {
#           {
#             reaction_id: r1.id,
#             title: 'testpost',
#             url: 'test'
#           }
#         }
#
#         it 'should be able to create a new literature' do
#           post '/api/v1/literatures', params
#           l = Literature.find_by(title: 'testpost')
#           expect(l).to_not be_nil
#           params.each do |k, v|
#             expect(l.attributes.symbolize_keys[k]).to eq(v)
#           end
#         end
#       end
#     end
#
#     describe 'DELETE /api/v1/literatures' do
#       context 'with valid parameters' do
#
#         let!(:params) {
#           {
#             reaction_id: r1.id,
#             title: 'testdelete',
#             url: 'test'
#           }
#         }
#
#         it 'should be able to delete a literature' do
#           post '/api/v1/literatures', params
#           l = Literature.find_by(title: 'testdelete')
#           expect(l).to_not be_nil
#           delete '/api/v1/literatures', { id: l.id }
#           l = Literature.find_by(title: 'testdelte')
#           expect(l).to be_nil
#         end
#       end
#     end
#
#   end
# end
