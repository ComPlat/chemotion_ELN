# frozen_string_literal: true

class AddSubmittedToKlassRevisions < ActiveRecord::Migration[6.1]
  def change
    add_column :dataset_klasses_revisions, :submitted, :integer, default: 0, null: false
    add_column :segment_klasses_revisions, :submitted, :integer, default: 0, null: false
    add_column :element_klasses_revisions, :submitted, :integer, default: 0, null: false
  end
end
