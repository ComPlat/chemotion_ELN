require 'rails_helper'

feature 'Message' do
  let!(:u_admin) { create(:user, first_name: 'Admin', last_name: 'Die') }
  let!(:u1) { create(:user, first_name: 'Tee', last_name: 'Der') }
  let!(:u2) { create(:user, first_name: 'Brot', last_name: 'Das') }
  let!(:c_sys) { create(:channel, subject: Channel::SYSTEM_UPGRADE, channel_type: 9) }
  let!(:c_nosys) { create(:channel, subject: Channel::SHARED_COLLECTION_WITH_ME, channel_type: 8) }
  # subscription
  let!(:s_nosys_1) { create(:subscription, channel: c_nosys, user: u1) }
  let!(:s_nosys_2) { create(:subscription, channel: c_nosys, user: u2) }
  # message created by Admin
  let!(:m1_sys) { create(:message, channel_id: c_sys.id,
    content: {
      data: 'Thanks for using ELN!\nTo make our system better for you, we bring updates every Friday.'
    }, created_by: u_admin.id) }
  let!(:n1_sys_u2) { create(:notification, message_id: m1_sys.id, user_id: u2.id) }
  let!(:m2_sys) { create(:message, channel_id: c_sys.id,
    content: {
      data: 'Thanks for using ELN!\nWe have new features for you.'
    }, created_by: u_admin.id) }
  let!(:m3_sys) { create(:message, channel_id: c_sys.id,
    content: {
      data: 'Thanks for using ELN!\nHave a nice weekend.'
    }, created_by: u_admin.id) }

  background do
    u2.confirmed_at = Time.now
    u2.save
    sign_in(u2)
  end

  describe 'Check message box and acknowledge messages' do
    before do
      Notification.create!(message: m2_sys, user: u2, is_ack: false)
      Notification.create!(message: m3_sys, user: u2, is_ack: false)
    end
    scenario 'check message box number', js: true do
      # required: wait for fetching messages
      sleep 10
      expect(find("span.badge.badge-pill")).to have_content '3'
    end

    scenario 'open message box and acknowledge all messages', js: true do
      # required: wait for fetching messages
      sleep 10
      find('button#notice-button').click
      # just for observation
      sleep 4
      find("button#notice-button-ack-all").click
      sleep 2
      expect(find("span.badge.badge-pill")).to have_content '0'
    end

    scenario 'open message box and acknowledge the message one by one', js: true do
      # required: wait for fetching messages
      sleep 10
      find('button#notice-button').click
      # just for observation
      sleep 4
      find("button#notice-button-ack-1").click
      # just for observation
      sleep 2
      find("button#notice-button-ack-2").click
      # just for observation
      sleep 2
      find("button#notice-button-ack-3").click
      sleep 2
      expect(find("span.badge.badge-pill")).to have_content '0'
    end
  end

  describe 'Ack on pop up notification' do
    scenario 'ack on pop up notification', js: true do
      # required: wait for fetching messages
      sleep 10
      find('button.notification-action-button').click
      sleep 6
      expect(find("span.badge.badge-pill")).to have_content '0'
    end
  end

end
