# frozen_string_literal: true

class Versioning::Reverters::ReactionsSampleReverter < Versioning::Reverters::BaseReverter
  def self.scope
    ReactionsSample.with_deleted
  end

  def call
    super
    record.reaction.save # Update svg file
  end

  def field_definitions
    {
      deleted_at: restore_sample,
    }.with_indifferent_access
  end

  private

  def restore_sample
    lambda do |value|
      return value if value.present?

      sample = Sample.with_deleted.find(record.sample_id)

      sample.update_columns(deleted_at: nil) # rubocop:disable Rails/SkipsModelValidations
      sample.collections.with_deleted.update_all(deleted_at: nil) # rubocop:disable Rails/SkipsModelValidations
      sample.collections_samples.with_deleted.update_all(deleted_at: nil) # rubocop:disable Rails/SkipsModelValidations

      value
    end
  end
end
