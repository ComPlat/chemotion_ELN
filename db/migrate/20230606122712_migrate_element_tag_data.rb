class MigrateElementTagData < ActiveRecord::Migration[6.1]
  def change
    tags = ElementTag.all
    tags = tags.select{ |t| t.taggable_data.has_key?('collection_labels') }
    tags.each do |tag|
      taggable = tag.taggable_data
      collection_ids = taggable['collection_labels'].pluck('id')
      taggable[:collection_ids] = collection_ids
      taggable = taggable.except('collection_labels')
      tag.update_columns(taggable_data: taggable)
    end
  end
end
