class CreateResearchPlanTableSchemas < ActiveRecord::Migration[4.2]
  def change
    create_table :research_plan_table_schemas do |t|
      t.string :name
      t.jsonb :value
      t.integer :created_by, null: false
      t.datetime :deleted_at
      t.timestamps null: false
    end
  end
end
