# frozen_string_literal: true

# # frozen_string_literal: true

# require 'rails_helper'
#   context 'with authorized user logged in' do
#     let(:user) { create(:user) }

#     before do
#       allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
#     end

#     # Permission related are reading and updating of a sample
#     describe 'GET /api/v1/wellplates/:id' do
#       context 'with appropriate permissions' do
#         let(:c1) { create(:collection, user_id: user.id) }
#         let(:w1) { create(:wellplate) }

#         before do
#           CollectionsWellplate.create!(wellplate: w1, collection: c1)

#           get "/api/v1/wellplates/#{w1.id}"
#         end

#         it 'returns 200 status code' do
#           expect(response.status).to eq 200
#         end
#       end

#       context 'with inappropriate permissions' do
#         let(:c1) { create(:collection, user_id: user.id + 1) }
#         let(:w1) { create(:wellplate) }

#         before do
#           CollectionsWellplate.create!(wellplate: w1, collection: c1)

#           get "/api/v1/wellplates/#{w1.id}"
#         end

#         it 'returns 401 unauthorized status code' do
#           expect(response.status).to eq 401
#         end
#       end
#     end

#     describe 'CREATE /api/v1/wellplates' do
#       context 'with appropriate permissions' do
#         let(:c1) { create(:collection, user_id: user.id, is_shared: true, permission_level: 3) }

#         let(:container) { create(:root_container) }
#         let(:params) { { name: 'Wellplate-test', readout_titles: %w[Mass Energy], wells: [], collection_id: c1.id, container: container } }
#         let(:params2) { { name: 'Wellplate-test2', readout_titles: %w[Mass Energy], wells: [], collection_id: c1.id, container: container } }

#         before do
#           post '/api/v1/wellplates/', params: params.to_json, headers: { 'CONTENT_TYPE' => 'application/json' }
#           post '/api/v1/wellplates/', params: params2.to_json, headers: { 'CONTENT_TYPE' => 'application/json' }
#           user.reload
#         end

#         it 'sets the correct short_label and increments user wellplate counter' do
#           wellplate = Wellplate.find_by(name: 'Wellplate-test2')
#           expect(wellplate.short_label).to eq "#{user.name_abbreviation}-WP2"
#           expect(user.counters['wellplates']).to eq '2'
#         end
#       end
#     end

#     describe 'DELETE /api/v1/wellplates' do
#       context 'with appropriate permissions' do
#         let(:c1) { create(:collection, user_id: user.id, is_shared: true, permission_level: 3) }
#         let(:w1) { create(:wellplate, name: 'test') }

#         before do
#           CollectionsWellplate.create!(wellplate: w1, collection: c1)

#           delete "/api/v1/wellplates/#{w1.id}"
#         end

#         it 'is able to delete a wellplate by id' do
#           wellplate = Wellplate.find_by(name: 'test')
#           expect(wellplate).to be_nil
#           array = Well.where(wellplate_id: w1.id)
#           expect(array).to match_array([])
#           array = CollectionsWellplate.where(wellplate_id: w1.id)
#           expect(array).to match_array([])
#         end
#       end
#     end

#     describe 'PUT /api/v1/wellplates/import_spreadsheet/:id' do
#       let(:collection) { create(:collection, user_id: user.id, is_shared: true, permission_level: 3) }
#       let(:attachment) { create(:attachment) }
#       let(:wellplate) { create(:wellplate, name: 'test', attachments: [attachment]) }
#       let(:params) { { wellplate_id: wellplate.id, attachment_id: attachment.id } }

#       let(:mock) { instance_double(Import::ImportWellplateSpreadsheet, wellplate: wellplate) }

#       before do
#         CollectionsWellplate.create!(wellplate: wellplate, collection: collection)

#         allow(Import::ImportWellplateSpreadsheet).to receive(:new).and_return(mock)
#         allow(mock).to receive(:process!)

#         put "/api/v1/wellplates/import_spreadsheet/#{wellplate.id}", params: params, as: :json
#       end

#       it 'returns 200 status code' do
#         expect(response.status).to eq 200
#       end

#       it 'receives process!' do
#         expect(mock).to have_received(:process!)
#       end

#       it 'returns a hash' do
#         expect(response.parsed_body).to be_a(Hash)
#         expect(response.parsed_body['wellplate']['type']).to eq('wellplate')
#         expect(response.parsed_body['attachments'].first['filename']).to eq(attachment.filename)
#       end
#     end
#   end
# end
