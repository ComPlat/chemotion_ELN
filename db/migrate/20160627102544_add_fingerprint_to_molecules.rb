class AddFingerprintToMolecules < ActiveRecord::Migration
  def change
    add_column :molecules, :fp0, :bigserial
    add_column :molecules, :fp1, :bigserial
    add_column :molecules, :fp2, :bigserial
    add_column :molecules, :fp3, :bigserial
    add_column :molecules, :fp4, :bigserial
    add_column :molecules, :fp5, :bigserial
    add_column :molecules, :fp6, :bigserial
    add_column :molecules, :fp7, :bigserial
    add_column :molecules, :fp8, :bigserial
    add_column :molecules, :fp9, :bigserial
    add_column :molecules, :fp10, :bigserial
    add_column :molecules, :fp11, :bigserial
    add_column :molecules, :fp12, :bigserial
    add_column :molecules, :fp13, :bigserial
    add_column :molecules, :fp14, :bigserial
    add_column :molecules, :fp15, :bigserial

    # Populate fingerprint
    Molecule.reset_column_information
    Molecule.all.each do |molecule|
      fp_vector =
        Chemotion::OpenBabelService.fingerprint_from_molfile(molecule.molfile)

      molecule.fp0  = fp_vector[0]
      molecule.fp1  = fp_vector[1]
      molecule.fp2  = fp_vector[2]
      molecule.fp3  = fp_vector[3]
      molecule.fp4  = fp_vector[4]
      molecule.fp5  = fp_vector[5]
      molecule.fp6  = fp_vector[6]
      molecule.fp7  = fp_vector[7]
      molecule.fp8  = fp_vector[8]
      molecule.fp9  = fp_vector[9]
      molecule.fp10 = fp_vector[10]
      molecule.fp11 = fp_vector[11]
      molecule.fp12 = fp_vector[12]
      molecule.fp13 = fp_vector[13]
      molecule.fp14 = fp_vector[14]
      molecule.fp15 = fp_vector[15]
    end

  end
end
