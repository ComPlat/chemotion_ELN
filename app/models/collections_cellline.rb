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
      collection_id: collection_ids,
      cellline_sample_id: cellline_ids,
      deleted_at: nil,
    ).destroy
  end

  def self.move_to_collection(cellline_ids, from_col_ids, to_col_id)
    raise "could not find collection with #{to_col_id}" unless Collection.find_by(id: to_col_id)

    Array(cellline_ids).each do |cell_line_id|
      next if to_col_id == from_col_ids

      CollectionsCellline.save_to_collection(cell_line_id, to_col_id)
      CollectionsCellline.delete_in_collection(cell_line_id, from_col_ids)
    end

    CollectionsCellline.update_collection_tag(cellline_ids)
  end

  def self.create_in_collection(cellline_ids, to_col_id)
    raise "could not find collection with #{to_col_id}" unless Collection.find_by(id: to_col_id)

    Array(cellline_ids).each do |cell_line_id|
      CollectionsCellline.save_to_collection(cell_line_id, to_col_id) unless CollectionsCellline.find_by(
        collection_id: to_col_id,
        cellline_sample_id: cell_line_id,
        deleted_at: nil,
      )
    end
    CollectionsCellline.update_collection_tag(cellline_ids)
  end

  def self.delete_in_collection(cell_line_id, coll_id)
    old_entry = CollectionsCellline.find_by(
      cellline_sample_id: cell_line_id,
      collection_id: coll_id,
      deleted_at: nil,
    )
    old_entry&.destroy
  end

  def self.save_to_collection(cell_line_id, to_col_id)
    entry_already_there = CollectionsCellline.find_by(
      cellline_sample_id: cell_line_id,
      collection_id: to_col_id,
    )

    return if entry_already_there

    CollectionsCellline.new(
      cellline_sample_id: cell_line_id,
      collection_id: to_col_id,
    ).save
  end

  def self.update_collection_tag(element_ids)
    CelllineSample.includes(:tag).where(id: element_ids).select(:id)
                  .each { |el| el.update_tag!(collection_tag: true) }
  end
end
