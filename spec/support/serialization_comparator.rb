# frozen_string_literal: true

# This support class is used during the refactoring of ActiveModel::Serializers to Grape::Entity, in order to check
# that the serialization result remains the same. When AMS has been completely removed, this class and the
# matcher using it can safely been removed.

# TODO: Remove when all AMS Serializers have been successfully refactored to Grape::Entity

class SerializationComparator
  class ComparisonError < StandardError
    def message
      [
        "Unsupported Serializer #{object.class}",
        'Only Grape::Entity and ActiveModel::Serializer are supported for comparison'
      ].join(': ')
    end
  end

  attr_reader :object_a, :object_b, :result_a, :result_b

  def initialize(object_a, object_b)
    @object_a = object_a
    @object_b = object_b
    @result_a = serialization_result(object_a)
    @result_b = serialization_result(object_b)
  end

  def equal?
    result_a == result_b
  end

  def failure_message
    [
      "Expected serialization results of #{object_a.class} and #{object_b.class} to be equal.",
      "#{object_a.class}: #{result_a.to_s}",
      "#{object_b.class}: #{result_b.to_s}"
    ].join("\n")
  end

  private

  def serialization_result(object)
    return serialize_entity(object) if object.is_a?(Grape::Entity)
    return serialize_serializer(object) if object.is_a?(ActiveModel::Serializer)

    raise ComparisonError
  end

  def serialize_entity(entity)
    JSON.parse(entity.to_json)
  end

  def serialize_serializer(serializer)
    serializer.serializable_hash.deep_stringify_keys
  end
end
