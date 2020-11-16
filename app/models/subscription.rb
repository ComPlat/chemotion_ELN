# frozen_string_literal: true

# == Schema Information
#
# Table name: subscriptions
#
#  id         :integer          not null, primary key
#  channel_id :integer
#  user_id    :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_subscriptions_on_channel_id_and_user_id  (channel_id,user_id) UNIQUE
#


# Publish-Subscription Model
class Subscription < ApplicationRecord
  belongs_to :channel
  belongs_to :user
end
