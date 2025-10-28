# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::InboxAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'samples resource' do
      let(:collection) { create(:collection, user: user) }
      let(:sample_1) { create(:sample, name: 'JB-R581-A', collections: [collection]) }
      let(:sample_2) { create(:sample, name: 'JB-R23-A', collections: [collection]) }
      let(:sample_3) { create(:sample, name: 'JB-R23-B', collections: [collection]) }

      describe 'get samples by sample name' do
        let(:search_string) { 'R23' }

        before do
          sample_1
          sample_2
          sample_3
          get "/api/v1/inbox/samples?search_string=#{search_string}"
        end

        it 'return fitting samples' do
          expect(JSON.parse(response.body)['samples'].size).to eq(2)
        end
      end

      # /api/v1/inbox/samples/:sample_id?analyses_id=:analyses_id
      describe 'assign attachment to to sample' do
        let(:inbox_container) { create(:inbox_container_with_attachments) }
        let(:attachment) { inbox_container.attachments.first }
        let(:params) { { attachment_id: attachment.id } }

        before do
          attachment.update_columns(created_for: user.id)
        end

        describe 'post attachment' do
          before { post "/api/v1/inbox/samples/#{sample_2.id}", params: params, as: :json }

          it 'return moved samples' do
            expect(JSON.parse(response.body)['container']['container_type']).to eq('dataset')
            expect(JSON.parse(response.body)['container']['attachments'].count).to eq(1)
          end
        end
      end
    end

    describe 'GET /api/v1/inbox' do
      context 'when fetching the inbox' do
        let!(:inbox_container_root) { create(:inbox_container_root) }
        let!(:inbox_container_child_first) do
          create(:inbox_container_with_attachments,
                 name: '1-Dev',
                 number_of_attachments: 2,
                 created_at: Time.zone.parse('2023-10-08 12:00:00'))
        end
        let!(:inbox_container_child_second) do
          create(:inbox_container_with_attachments,
                 name: '2-Dev',
                 number_of_attachments: 3,
                 created_at: Time.zone.parse('2023-11-08 12:00:00'))
        end

        before do
          inbox_container_root.children << inbox_container_child_first
          inbox_container_root.children << inbox_container_child_second
          inbox_container_root.save!

          user.container = inbox_container_root
        end

        it 'returns the inbox contents sorted by name as default' do
          get '/api/v1/inbox', params: { cnt_only: false }

          expect(JSON.parse(response.body)['inbox']['children'].size).to eq(2)
          expect(JSON.parse(response.body)['inbox']['children'].pluck('id')).to eq(
            [
              inbox_container_child_first.id,
              inbox_container_child_second.id,
            ],
          )
        end

        it 'gives error for invalid value for sort_column' do
          get '/api/v1/inbox', params: { cnt_only: false, sort_column: 'not_allowed' }

          expect(response).to have_http_status(:bad_request)
          expect(JSON.parse(response.body)['error']).to eq('sort_column does not have a valid value')
        end
      end
    end
  end
end
