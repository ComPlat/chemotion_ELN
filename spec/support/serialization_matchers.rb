# frozen_string_literal: true

# This matcher is used during the refactoring of ActiveModel::Serializers to Grape::Entity, in order to check that the
# serialization result remains the same. When AMS has been completely removed, this matcher and the
# SerializationComparator support class can safely been removed.

# TODO: Remove when all AMS Serializers have been successfully refactored to Grape::Entity

require 'rspec/expectations'

RSpec::Matchers.define :serialize_equally_to do |object_a|
  match do |object_b|
    SerializationComparator.new(object_a, object_b).equal?
  end

  failure_message do |object_b|
    SerializationComparator.new(object_a, object_b).failure_message
  end
end
