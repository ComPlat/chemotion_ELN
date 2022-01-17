class CreateResearchPlanMetadata < ActiveRecord::Migration[4.2]
  def up
    create_table :research_plan_metadata do |t|
      t.integer :research_plan_id

      t.string :doi
      t.string :url
      t.string :landing_page
      t.string :name
      t.string :type
      t.string :description
      t.string :publisher
      t.integer :publication_year

      t.jsonb :dates

      t.timestamps null: false
      t.datetime :deleted_at, index: true

      t.string :data_cite_prefix
      t.datetime :data_cite_created_at
      t.datetime :data_cite_updated_at
      t.integer :data_cite_version
      t.jsonb :data_cite_last_response, default: { }
      t.string :data_cite_state, default: 'draft'
      t.string :data_cite_creator_name
    end

    add_index :research_plan_metadata, :research_plan_id
  end

  def down
    drop_table :research_plan_metadata
  end
end
