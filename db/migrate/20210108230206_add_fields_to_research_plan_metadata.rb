class AddFieldsToResearchPlanMetadata < ActiveRecord::Migration[4.2]
  def change
    rename_column :research_plan_metadata, :name, :title
    remove_column :research_plan_metadata, :description, :string

    add_column :research_plan_metadata, :description, :jsonb
    add_column :research_plan_metadata, :creator, :text
    add_column :research_plan_metadata, :affiliation, :text
    add_column :research_plan_metadata, :contributor, :text
    add_column :research_plan_metadata, :language, :string
    add_column :research_plan_metadata, :rights, :text

    add_column :research_plan_metadata, :format, :string
    add_column :research_plan_metadata, :version, :string
    add_column :research_plan_metadata, :geo_location, :jsonb
    add_column :research_plan_metadata, :funding_reference, :jsonb
    add_column :research_plan_metadata, :subject, :text
    add_column :research_plan_metadata, :alternate_identifier, :jsonb
    add_column :research_plan_metadata, :related_identifier, :jsonb
  end
end
