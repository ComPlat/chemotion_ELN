# frozen_string_literal: true

# Create computed_props for somes sample of each Person user in the database
# Idempotent: no.

require 'factory_bot'
require 'faker'
require_relative '../../../spec/factories/computed_props'

Person.find_each do |user|
  user.samples.limit(50).each do |sample|
    FactoryBot.create(:computed_prop, creator: user.id, sample_id: sample.id, molecule_id: sample.molecule.id)
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.debug { "ComputedProp already exists: #{e.record.name}" }
  end
end
