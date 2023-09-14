# frozen_string_literal: true

class CollectionsCellline < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :cellline_sample

  include Tagging
  include Collecting

  # Remove from collection and process associated elements (and update collection info tag)
  def self.remove_in_collection(cellline_ids, collection_ids)
    CollectionsCellline.find_by(
      collection_id:collection_ids,
      cellline_sample_id:cellline_ids,
      deleted_at: nil
    ).destroy
  end

  def self.move_to_collection(cellline_ids, from_col_ids, to_col_ids)
    Array(cellline_ids).each{ |cell_line_id|
     
      CollectionsCellline.new(
        cellline_sample_id:cell_line_id,
        collection_id: to_col_ids,
      ).save;
      

      old_entry = CollectionsCellline.find_by(
        cellline_sample_id:cell_line_id,
        collection_id: from_col_ids,
        deleted_at: nil
      )
      old_entry.destroy if old_entry
    }
    
    CollectionsCellline.update_collection_tag(cellline_ids)
  end

  def self.update_collection_tag(element_ids)
     CelllineSample.includes(:tag).where(id: element_ids).select(:id)
           .each { |el| el.update_tag!(collection_tag: true) }
  end
end
