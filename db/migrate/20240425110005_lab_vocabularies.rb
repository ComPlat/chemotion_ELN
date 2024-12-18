class LabVocabularies < ActiveRecord::Migration[6.1]
  def self.up
    unless table_exists? :vocabularies
      create_table :vocabularies do |t|
        t.string :identifier, unique: true
        t.string :name
        t.string :label
        t.string :field_type
        t.string :description
        t.integer :opid, default: 0
        t.string :term_id
        t.string :source
        t.string :source_id
        t.string :layer_id
        t.string :field_id
        t.jsonb :properties, default: {}
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
    end
  end

  def self.down
    drop_table :vocabularies if table_exists? :vocabularies
  end
end