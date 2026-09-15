class RenameSampleNameInMedia < ActiveRecord::Migration[6.1]
  def change

    rename_column :media, :sample_name, :name
  end
end
