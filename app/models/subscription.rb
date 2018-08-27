# frozen_string_literal: true

# Publish-Subscription Model
class Subscription < ActiveRecord::Base
  belongs_to :channel
  belongs_to :user
end
