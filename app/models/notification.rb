# frozen_string_literal: true

# Publish-Subscription Model
class Notification < ActiveRecord::Base
  belongs_to :message
  belongs_to :user
end
