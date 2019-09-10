# frozen_string_literal: true

# == Schema Information
#
# Table name: notifications
#
#  id         :integer          not null, primary key
#  message_id :integer
#  user_id    :integer
#  is_ack     :integer          default(0)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_notifications_on_message_id_and_user_id  (message_id,user_id) UNIQUE
#


# Publish-Subscription Model
class Notification < ActiveRecord::Base
  belongs_to :message
  belongs_to :user
end
