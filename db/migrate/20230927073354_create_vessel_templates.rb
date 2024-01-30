class CreateVesselTemplates < ActiveRecord::Migration[6.1]
  def change
    create_table :vessel_templates, id: :uuid do |t|
      t.string :name
      t.string :details
      t.string :material_details
      t.string :material_type
      t.string :vessel_type
      t.integer :volume_amount
      t.string :volume_unit

      t.timestamps
      t.datetime :deleted_at, index: true
    end
  end
end
