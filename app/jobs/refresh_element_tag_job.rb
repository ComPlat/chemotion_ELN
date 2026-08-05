class RefreshElementTagJob < ApplicationJob
  queue_as :refresh_element_tag

  # Collection-bearing element types that, beyond Sample/Reaction/Labimotion::Element, also keep
  # a collection_labels tag and must be refreshed after the collection-share refactor. The job
  # previously skipped these, leaving their collection_labels stale (old format / sync ids).
  # Vessel is intentionally excluded: vessels.id is uuid but element_tags.taggable_id is integer,
  # so vessels never carry an element_tag (constantize.find_each would just no-op/mismatch).
  OTHER_COLLECTION_TAGGABLES = %w[
    Wellplate
    Screen
    ResearchPlan
    DeviceDescription
    CelllineSample
    SequenceBasedMacromoleculeSample
  ].freeze

  def perform
    Sample.find_each(batch_size: 100) do |sample|
      sample.update_tag!(collection_tag: true, analyses_tag: true, resources_tag: true)
    end
    Reaction.find_each(batch_size: 100) do |reaction|
      reaction.update_tag!(collection_tag: true)
    end
    Labimotion::Element.find_each(batch_size: 100) do |el|
      el.update_tag!(collection_tag: true, analyses_tag: true)
    end
    OTHER_COLLECTION_TAGGABLES.each do |class_name|
      class_name.constantize.find_each(batch_size: 100) do |record|
        record.update_tag!(collection_tag: true)
      end
    end
  end
end
