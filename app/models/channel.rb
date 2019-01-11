# frozen_string_literal: true

# Publish-Subscription Model
class Channel < ActiveRecord::Base
  has_many :subscriptions
  SYSTEM_UPGRADE = 'System Upgrade'
  SYSTEM_NOTIFICATION = 'System Notification'
  SYSTEM_MAINTENANCE = 'System Maintenance'
  SHARED_COLLECTION_WITH_ME = 'Shared Collection With Me'
  SYNCHRONIZED_COLLECTION_WITH_ME = 'Synchronized Collection With Me'
  INBOX_ARRIVALS_TO_ME = 'Inbox Arrivals To Me'
  REPORT_GENERATOR_NOTIFICATION = 'Report Generator Notification'
  SEND_INDIVIDUAL_USERS = 'Send Individual Users'
  SEND_IMPORT_NOTIFICATION = 'Import Notification'
  COMPUTED_PROPS_NOTIFICATION = 'Computed Prop Notification'
  GATE_TRANSFER_NOTIFICATION = 'Gate Transfer Completed'
  COLLECTION_TAKE_OWNERSHIP = 'Collection Take Ownership'
end
