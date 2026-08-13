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
                       data: 'Thanks for using ELN! To make our system better for you, we bring updates every Friday.',
                     }, created_by: u_admin.id)
  end
  # message created by u2
  let!(:m_nosys) do
    create(:message, channel_id: c_nosys.id,
                     content: {
                       data: 'How are you?',
                     }, created_by: u2.id)
  end
  let!(:n_sys_u2) { create(:notification, message_id: m_sys.id, user_id: u2.id) }

  context 'with authorized user logged in' do
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

    # No memoized helpers here (this group's ancestors are already at the RSpec/MultipleMemoizedHelpers
    # cap) — message/notification are plain locals inside the one example that needs them.
    describe 'a message flagged content.silent' do
      # It must still be delivered on the first fetch — silent only means "no toast", not "hidden" —
      # but is auto-acknowledged as a side effect of that same fetch (see MessageAPI's list endpoint),
      # so it never sits "unread" waiting for a dismiss that will never come (there is no toast to
      # dismiss it with), while staying visible under is_ack=1 like any other acknowledged message.
      it 'is delivered once as unread, then auto-acknowledged on that fetch' do
        message = create(:message, channel_id: c_nosys.id, content: { data: 'permission updated', silent: true },
                                   created_by: u2.id)
        # MessageEntity#id is the notify_messages view's id, which is the Notification id, not the
        # Message id (see MessageEntity's separate `message_id` field) — assert against this one.
        notification = Notification.create!(message: message, user: u1, is_ack: false)

        get '/api/v1/messages/list.json?is_ack=0'
        first_fetch_ids = JSON.parse(response.body)['messages'].pluck('id')

        get '/api/v1/messages/list.json?is_ack=0'
        second_fetch_ids = JSON.parse(response.body)['messages'].pluck('id')

        get '/api/v1/messages/list.json?is_ack=1'
        acked_ids = JSON.parse(response.body)['messages'].pluck('id')

        expect(first_fetch_ids).to include(notification.id)
        expect(second_fetch_ids).not_to include(notification.id)
        expect(acked_ids).to include(notification.id)
      end
    end

    describe 'publish a message' do
      before do
        post '/api/v1/messages/new', params: { channel_id: m_sys.channel_id, content: m_sys.content[:data] }.to_json,
                                     headers: { 'CONTENT_TYPE' => 'application/json' }
      end

      it 'returns 201' do
        expect(response.code).to eq '201'
      end
    end
  end
end
