# frozen_string_literal: true

# Create computed_props for somes sample of each Person user in the database
# Idempotent: no.

require 'factory_bot'
require 'faker'
require_relative '../../../spec/factories/computed_props'

Person.find_each do |user|
  user.samples.limit(50).each do |sample|
    FactoryBot.create(:computed_prop, user: user, sample_id: sample.id, molecule: sample.molecule)
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.debug { "ComputedProp already exists: #{e.record}" }
  end
end
