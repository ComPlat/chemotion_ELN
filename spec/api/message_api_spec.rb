# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::MessageAPI do
  let!(:u_admin) { create(:user, first_name: 'Admin', last_name: 'Die') }
  let!(:u1) { create(:user, first_name: 'Tee', last_name: 'Der') }
  let!(:u2) { create(:user, first_name: 'Brot', last_name: 'Das') }
  let!(:c_sys) { create(:channel, subject: Channel::SYSTEM_UPGRADE, channel_type: 9) }
  let!(:c_nosys) { create(:channel, subject: Channel::SHARED_COLLECTION_WITH_ME, channel_type: 8) }
  # subscription
  let!(:s_nosys_1) { create(:subscription, channel: c_nosys, user: u1) }
  let!(:s_nosys_2) { create(:subscription, channel: c_nosys, user: u2) }
  # message created by Admin
  let!(:m_sys) do
    create(:message, channel_id: c_sys.id,
                     content: {
                       data: 'Thanks for using ELN! To make our system better for you, we bring updates every Friday.'
                     }, created_by: u_admin.id)
  end
  # message created by u2
  let!(:m_nosys) do
    create(:message, channel_id: c_nosys.id,
                     content: {
                       data: 'How are you?'
                     }, created_by: u2.id)
  end
  let!(:n_sys_u2) { create(:notification, message_id: m_sys.id, user_id: u2.id) }

  context 'authorized user logged in' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user)
        .and_return(u1)
    end

    describe 'No unread messages of the current user, u1' do
      before do
        get '/api/v1/messages/list.json?is_ack=0'
      end

      it 'no messages' do
        messages = JSON.parse(response.body)['messages']
        expect(messages.length).to eq 0
      end
      if Rails.env.production?
        it 'get system version' do
          expect(response.body).to include('version')
        end
      end
    end

    describe 'Return unread messages of the current user, u1' do
      before do
        # message from u2
        Notification.create!(message: m_nosys, user: u1, is_ack: false)
        get '/api/v1/messages/list.json?is_ack=0'
      end

      it 'unread messages' do
        messages = JSON.parse(response.body)['messages']
        expect(messages.length).to eq 1
      end
      if Rails.env.production?
        it 'get system version' do
          expect(response.body).to include('version')
        end
      end
    end
  end
end
