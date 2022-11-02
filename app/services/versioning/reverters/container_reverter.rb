# frozen_string_literal: true

class Versioning::Reverters::ContainerReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Container.with_deleted
  end

  def field_definitions
    {
      deleted_at: restore_container,
    }.with_indifferent_access
  end

  private

  def restore_container
    lambda do |value|
      return value if value.present?

      case record.container_type
      when 'analysis'
        generations = 2
        ancestor_id = record.parent.parent_id
      when 'dataset'
        analysis = Container.with_deleted.find(record.parent_id)
        # if analysis.deleted?
        #   hierarchy = ContainerHierarchy.find_or_initialize_by(
        #     ancestor_id: analysis.parent.parent_id,
        #     descendant_id: analysis.id,
        #     generations: 2,
        #   )
        #   hierarchy.save(validate: false)
        #   analysis.update_columns(deleted_at: nil) # rubocop:disable Rails/SkipsModelValidations
        # end
        generations = 3
        ancestor_id = analysis.parent.parent_id
      end

      hierarchy = ContainerHierarchy.find_or_initialize_by(
        ancestor_id: ancestor_id,
        descendant_id: record.id,
        generations: generations,
      )
      hierarchy.save(validate: false)

      value
    end
  end
end
