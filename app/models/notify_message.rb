# == Schema Information
#
# Table name: notify_messages
#
#  id           :integer
#  message_id   :integer
#  subject      :string
#  content      :jsonb
#  created_at   :datetime
#  updated_at   :datetime
#  sender_id    :integer
#  sender_name  :text
#  channel_type :integer
#  receiver_id  :integer
#  is_ack       :integer
#

class NotifyMessage < ApplicationRecord
end
