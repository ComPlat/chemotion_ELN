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

      # Pins the combined channel_type-5-OR-silent auto-ack query: both categories must still be
      # acked together in one request, not just each in isolation.
      it 'auto-acks a channel-5 notification and a silent one together, in a single request' do
        channel_with_type_five = create(:channel, channel_type: 5)
        channel_5_message = create(:message, channel_id: channel_with_type_five.id, content: { data: 'chan 5' },
                                             created_by: u2.id)
        channel_5_notification = Notification.create!(message: channel_5_message, user: u1, is_ack: false)
        silent_message = create(:message, channel_id: c_nosys.id, content: { data: 'silent', silent: true },
                                          created_by: u2.id)
        silent_notification = Notification.create!(message: silent_message, user: u1, is_ack: false)

        get '/api/v1/messages/list.json?is_ack=0'

        get '/api/v1/messages/list.json?is_ack=1'
        acked_ids = JSON.parse(response.body)['messages'].pluck('id')

        expect(acked_ids).to include(channel_5_notification.id, silent_notification.id)
      end
    end

    describe 'GET config' do
      # Isolates each example's ENV stub instead of a shared `around`, since only two keys ever
      # need overriding here and different examples override different subsets.
      def fetch_config
        get '/api/v1/messages/config'
        JSON.parse(response.body)
      end

      it 'defaults to messageAutoInterval 6000 and idleTimeout 12 when unset' do
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with('MESSAGE_AUTO_INTERNAL').and_return(nil)
        allow(ENV).to receive(:[]).with('MESSAGE_IDLE_TIME').and_return(nil)

        config = fetch_config

        expect(config['messageAutoInterval']).to eq(6000)
        expect(config['idleTimeout']).to eq(12)
      end

      # A misconfigured .env must not be able to drive every client into a runaway polling loop —
      # the served value is floored regardless of what the deployment sets it to.
      it 'floors messageAutoInterval at 500 and idleTimeout at 5 when set below that' do
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with('MESSAGE_AUTO_INTERNAL').and_return('1')
        allow(ENV).to receive(:[]).with('MESSAGE_IDLE_TIME').and_return('0')

        config = fetch_config

        expect(config['messageAutoInterval']).to eq(500)
        expect(config['idleTimeout']).to eq(5)
      end

      # .to_i coerces non-numeric garbage to 0, which then hits the same floor as an explicit
      # too-low value — no separate guard needed for a malformed (as opposed to merely small) var.
      it 'floors non-numeric garbage the same way' do
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with('MESSAGE_AUTO_INTERNAL').and_return('not-a-number')
        allow(ENV).to receive(:[]).with('MESSAGE_IDLE_TIME').and_return('also-not-a-number')

        config = fetch_config

        expect(config['messageAutoInterval']).to eq(500)
        expect(config['idleTimeout']).to eq(5)
      end

      it 'passes through a value already above the floor unchanged' do
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with('MESSAGE_AUTO_INTERNAL').and_return('8000')
        allow(ENV).to receive(:[]).with('MESSAGE_IDLE_TIME').and_return('20')

        config = fetch_config

        expect(config['messageAutoInterval']).to eq(8000)
        expect(config['idleTimeout']).to eq(20)
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
