class ChangeVolumeAmountToFloatInVesselTemplates < ActiveRecord::Migration[6.1]
  def up
    change_column :vessel_templates, :volume_amount, :float
  end

  def down
    change_column :vessel_templates, :volume_amount, :integer
  end
end
