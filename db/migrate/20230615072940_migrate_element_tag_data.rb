# frozen_string_literal: true

# desc: Migrate element tag data from old format to new format
class MigrateElementTagData < ActiveRecord::Migration[6.1]
  # old format: taggable_data: {collection_labels: [{id: 1, name: 'collection1', user_id: ....}, ...]}
  # new format: taggable_data: {collection_ids: [1, 2]}
  # destroy element_tag if taggable_id or taggable_type is nil
  # destroy element_tag if taggable is not present
  # pluck actual collection ids from corresponding collection_elements table
  # update column taggable_data with collection_ids, remove collection_labels
  def up
    first_swipe
    second_swipe

    ElementTag.find_each do |element_tag|
      element = element_tag.taggable

      unless element
        element_tag.destroy
        next
      end

      # element should have many collections through collection_elements
      klass = "collections_#{element_tag.taggable_type.underscore.pluralize}"
      collection_ids = element.respond_to?(klass) ? element.send(klass).pluck(:id) : []
      taggable_data = element_tag.taggable_data&.except('collection_labels') || {}
      taggable_data[:collection_ids] = collection_ids
      element_tag.update_columns(taggable_data: taggable_data)
    end
  end

  def down
    # do nothing
  end

  private

  # destroy all element_tags that have taggable_id or taggable_type nil
  def first_swipe
    ElementTag.where(taggable_id: nil).or(ElementTag.where(taggable_type: nil)).in_batches(&:destroy_all)
  end

  # destroy all element_tags that have taggable_type that is not a valid class name
  def second_swipe
    types = ElementTag.select(:taggable_type).distinct.pluck(:taggable_type)
    undefined_types = types.select do |type|
      !type.constantize
    rescue StandardError
      true
    end.compact
    ElementTag.where(taggable_type: undefined_types).in_batches(&:destroy_all)
  end
end
