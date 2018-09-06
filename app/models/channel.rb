# frozen_string_literal: true

# Publish-Subscription Model
class Channel < ActiveRecord::Base
  has_many :subscriptions
  SYSTEM_UPGRADE = 'System Upgrade'
  SYSTEM_NOTIFICATION = 'System Notification'
  SYSTEM_MAINTENANCE = 'System Maintenance'
  SHARED_COLLECTION_WITH_ME = 'Shared Collection With Me'
  SYNCHRONIZED_COLLECTION_WITH_ME = 'Synchronized Collection With Me'
end
