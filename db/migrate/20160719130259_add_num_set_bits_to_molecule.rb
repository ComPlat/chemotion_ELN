class AddNumSetBitsToMolecule < ActiveRecord::Migration
  def change
    Molecule.reset_column_information
    add_column :molecules, :num_set_bits, :integer, :limit => 1

    # Populate this new column
    Molecule.reset_column_information
    Molecule.all.each do |molecule|
      total_num_set_bits = 0
      0.upto(15) do |i|
        field_name = "fp" + i.to_s
        fp = molecule.send(field_name)
        num_set_bits = fp.count("1")

        total_num_set_bits = total_num_set_bits + num_set_bits
      end

      molecule.num_set_bits = total_num_set_bits
      molecule.save!
    end
  end
end
