# frozen_string_literal: true

class AddMetadataToGenerics < ActiveRecord::Migration[6.1]
  TABLES = %w[dataset segment element].freeze

  def change
    TABLES.each do |table_name|
      add_column "#{table_name}s", :metadata, :jsonb, default: {}, null: false
      add_column "#{table_name}s_revisions", :metadata, :jsonb, default: {}, null: false
      add_column "#{table_name}_klasses", :metadata, :jsonb, default: {}, null: false
      add_column "#{table_name}_klasses_revisions", :metadata, :jsonb, default: {}, null: false
      add_check_constraint "#{table_name}s", "jsonb_typeof(metadata) = 'object'", name: "chk_#{table_name}s_metadata"
      add_check_constraint "#{table_name}s_revisions", "jsonb_typeof(metadata) = 'object'", name: "chk_#{table_name}s_revisions_metadata"
      add_check_constraint "#{table_name}_klasses", "jsonb_typeof(metadata) = 'object'", name: "chk_#{table_name}_klasses_metadata"
      add_check_constraint "#{table_name}_klasses_revisions", "jsonb_typeof(metadata) = 'object'", name: "chk_#{table_name}_klasses_revisions_metadata"
    end
  end
end
