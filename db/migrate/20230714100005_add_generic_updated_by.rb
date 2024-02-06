# frozen_string_literal: true

# Add column identifier into segment_klasses
class AddGenericUpdatedBy < ActiveRecord::Migration[6.1]
  def self.up
    add_column :segment_klasses, :updated_by, :integer unless column_exists? :segment_klasses, :updated_by
    add_column :segment_klasses, :released_by, :integer unless column_exists? :segment_klasses, :released_by
    add_column :segment_klasses, :sync_by, :integer unless column_exists? :segment_klasses, :sync_by
    add_column :segment_klasses, :admin_ids, :jsonb, default: {} unless column_exists? :segment_klasses, :admin_ids
    add_column :segment_klasses, :user_ids, :jsonb, default: {} unless column_exists? :segment_klasses, :user_ids
    add_column :segment_klasses, :version, :string unless column_exists? :segment_klasses, :version
    add_column :segment_klasses_revisions, :version, :string unless column_exists? :segment_klasses_revisions, :version
    add_column :dataset_klasses, :updated_by, :integer unless column_exists? :dataset_klasses, :updated_by
    add_column :dataset_klasses, :released_by, :integer unless column_exists? :dataset_klasses, :released_by
    add_column :dataset_klasses, :sync_by, :integer unless column_exists? :dataset_klasses, :sync_by
    add_column :dataset_klasses, :admin_ids, :jsonb, default: {} unless column_exists? :dataset_klasses, :admin_ids
    add_column :dataset_klasses, :user_ids, :jsonb, default: {} unless column_exists? :dataset_klasses, :user_ids
    add_column :dataset_klasses, :version, :string unless column_exists? :dataset_klasses, :version
    add_column :dataset_klasses_revisions, :version, :string unless column_exists? :dataset_klasses_revisions, :version
    add_column :element_klasses, :updated_by, :integer unless column_exists? :element_klasses, :updated_by
    add_column :element_klasses, :released_by, :integer unless column_exists? :element_klasses, :released_by
    add_column :element_klasses, :sync_by, :integer unless column_exists? :element_klasses, :sync_by
    add_column :element_klasses, :admin_ids, :jsonb, default: {} unless column_exists? :element_klasses, :admin_ids
    add_column :element_klasses, :user_ids, :jsonb, default: {} unless column_exists? :element_klasses, :user_ids
    add_column :element_klasses, :version, :string unless column_exists? :element_klasses, :version
    add_column :element_klasses_revisions, :version, :string unless column_exists? :element_klasses_revisions, :version
  end

  def self.down
    remove_column :segment_klasses, :updated_by if column_exists? :segment_klasses, :updated_by
    remove_column :segment_klasses, :released_by if column_exists? :segment_klasses, :released_by
    remove_column :segment_klasses, :sync_by if column_exists? :segment_klasses, :sync_by
    remove_column :segment_klasses, :admin_ids if column_exists? :segment_klasses, :admin_ids
    remove_column :segment_klasses, :user_ids if column_exists? :segment_klasses, :user_ids
    remove_column :segment_klasses, :version if column_exists? :segment_klasses, :version
    remove_column :segment_klasses_revisions, :version if column_exists? :segment_klasses_revisions, :version
    remove_column :dataset_klasses, :updated_by if column_exists? :dataset_klasses, :updated_by
    remove_column :dataset_klasses, :released_by if column_exists? :dataset_klasses, :released_by
    remove_column :dataset_klasses, :sync_by if column_exists? :dataset_klasses, :sync_by
    remove_column :dataset_klasses, :admin_ids if column_exists? :dataset_klasses, :admin_ids
    remove_column :dataset_klasses, :user_ids if column_exists? :dataset_klasses, :user_ids
    remove_column :dataset_klasses, :version if column_exists? :dataset_klasses, :version
    remove_column :dataset_klasses_revisions, :version if column_exists? :dataset_klasses_revisions, :version
    remove_column :element_klasses, :updated_by if column_exists? :element_klasses, :updated_by
    remove_column :element_klasses, :released_by if column_exists? :element_klasses, :released_by
    remove_column :element_klasses, :sync_by if column_exists? :element_klasses, :sync_by
    remove_column :element_klasses, :admin_ids if column_exists? :element_klasses, :admin_ids
    remove_column :element_klasses, :user_ids if column_exists? :element_klasses, :user_ids
    remove_column :element_klasses, :version if column_exists? :element_klasses, :version
    remove_column :element_klasses_revisions, :version if column_exists? :element_klasses_revisions, :version

  end
end
