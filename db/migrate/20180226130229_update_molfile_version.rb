class UpdateMolfileVersion < ActiveRecord::Migration[4.2]
  # def change
  #   add_column :samples, :molfile_version, :string, limit: 20
  #   add_column :molecules, :molfile_version, :string, limit: 20
  # end

  [Sample, Molecule].each do |table|
    # table.connection.schema_cache.clear!
    table.reset_column_information
    table.find_each do |element|
      version = Chemotion::OpenBabelService.molfile_version(element.molfile)
      element.update_column(:molfile_version, version) if version
    end
  end
end
