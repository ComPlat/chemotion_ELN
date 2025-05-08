class AddUniqueIndexToVesselTemplatesName < ActiveRecord::Migration[6.1]
  def up
    VesselTemplate.group(:name).having('COUNT(*) > 1').pluck(:name).each do |dup_name|
      VesselTemplate.where(name: dup_name).order(:created_at).each.with_index(1) do |vessel_template, idx|
        new_name = idx == 1 ? vessel_template.name : "#{vessel_template.name}-#{idx}"
        vessel_template.update_columns(name: new_name)
      end
    end

    add_index :vessel_templates, :name, unique: true
  end

  def down
    remove_index :vessel_templates, :name
  end
end
