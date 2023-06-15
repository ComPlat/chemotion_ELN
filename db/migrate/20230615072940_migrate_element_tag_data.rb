# frozen_string_literal: true

class MigrateElementTagData < ActiveRecord::Migration[6.1]
  def change
    ElementTag.find_in_batches(batch_size: 500) do |batch|
      batch.each do |tag|
        return tag.destroy if tag.taggable_id.nil?

        taggable = tag.taggable_data
        collection_ids = taggable['collection_labels']&.pluck('id')
        taggable[:collection_ids] = collection_ids
        taggable = taggable.except('collection_labels')
        tag.update_columns(taggable_data: taggable)

        sleep 0.5
      end
      sleep 10
    end
  end
end
