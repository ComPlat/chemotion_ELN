# frozen_string_literal: true

require 'rails_helper'

describe 'Message' do
  let!(:u_admin) { create(:user, first_name: 'Admin', last_name: 'Die') }
  let!(:u1) { create(:user, first_name: 'Tee', last_name: 'Der') }
  let!(:u2) { create(:user, first_name: 'Brot', last_name: 'Das') }
  let!(:c_sys) { create(:channel, subject: Channel::SYSTEM_UPGRADE, channel_type: 9) }
  let!(:c_nosys) { create(:channel, subject: Channel::SHARED_COLLECTION_WITH_ME, channel_type: 8) }
  # subscription
  let!(:s_nosys_1) { create(:subscription, channel: c_nosys, user: u1) }
  let!(:s_nosys_2) { create(:subscription, channel: c_nosys, user: u2) }
  # message created by Admin
  let!(:m1_sys) do
    create(:message, channel_id: c_sys.id,
                     content: {
                       data: 'Thanks for using ELN!\nTo make our system better for you, we bring updates every Friday.'
                     }, created_by: u_admin.id)
  end
  let!(:n1_sys_u2) { create(:notification, message_id: m1_sys.id, user_id: u2.id) }
  let!(:m2_sys) do
    create(:message, channel_id: c_sys.id,
                     content: {
                       data: 'Thanks for using ELN!\nWe have new features for you.'
                     }, created_by: u_admin.id)
  end
  let!(:m3_sys) do
    create(:message, channel_id: c_sys.id,
                     content: {
                       data: 'Thanks for using ELN!\nHave a nice weekend.'
                     }, created_by: u_admin.id)
  end

  # NB: workaround of dismissing notifs not working on CI: notification wrapper on right top corner still seems to overlap with notification button
  # ended up doubling window width

  let(:notification_pops) do
    lambda {
      i = 0
      bool = false
      until bool
        i += 1
        sleep 1
        bool = all('div.notification-message', wait: 0).size == 3 || i > 10
      end
    }
  end

  before do
    u2.update!(confirmed_at: Time.now, account_active: true)
    sign_in(u2)
  end

  describe 'Check message box and acknowledge messages' do
    before do
      Notification.create!(message: m2_sys, user: u2, is_ack: false)
      Notification.create!(message: m3_sys, user: u2, is_ack: false)
    end

    it 'check message box number', js: true do      
      within "span.badge.badge-pill" do
        sleep(2)
        expect(page).to have_content(3)
      end
    end

    it 'open message box and acknowledge all messages', js: true do
      # required: wait for fetching messages
      notification_pops[]
      sleep 2
      # dismiss pop-up message that could hide the notice-button depending on the viewport size
      all('div.notification-message').reverse_each(&:click)
      find_button('notice-button').click
      # just for observation
      find_button('notice-button-ack-all').click

      expect(find('span.badge.badge-pill')).to have_content '0'
    end

    it 'open message box and acknowledge the message one by one', js: true do
      # required: wait for fetching messages
      notification_pops[]
      sleep 2
      # dismiss pop-up message that could hide the notice-button depending on the viewport size
      all('div.notification-message').reverse_each(&:click)

      find_button('notice-button', wait: 10).click
      # just for observation
      find_button('notice-button-ack-1').click
      # just for observation
      find_button('notice-button-ack-2').click
      # just for observation
      find_button('notice-button-ack-3').click

      expect(find('span.badge.badge-pill')).to have_content '0'
    end
  end
end
