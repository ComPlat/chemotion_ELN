class ChangeDataTypeForSolvent < ActiveRecord::Migration
  def change
    rename_column :samples, :solvent, :solvent_old
    add_column :samples, :solvent, :jsonb
    Sample.where(solvent: [nil, []]).where.not(solvent_old: [nil, '']).each do |item|
      item.solvent = item.solvent_old if item.solvent_old.is_a? JSON
      item.solvent = item.solvent_old.to_json if item.solvent_old.is_a? String
      item.save!
    end

    remove_column :samples, :solvent_old, :string
  end
end
