class AddFingerprintToMolecules < ActiveRecord::Migration[4.2]
  def change
    Molecule.reset_column_information

    add_column :molecules, :fp0, "bit(64)" unless column_exists? :molecules, :fp0
    add_column :molecules, :fp1, "bit(64)" unless column_exists? :molecules, :fp1
    add_column :molecules, :fp2, "bit(64)" unless column_exists? :molecules, :fp2
    add_column :molecules, :fp3, "bit(64)" unless column_exists? :molecules, :fp3
    add_column :molecules, :fp4, "bit(64)" unless column_exists? :molecules, :fp4
    add_column :molecules, :fp5, "bit(64)" unless column_exists? :molecules, :fp5
    add_column :molecules, :fp6, "bit(64)" unless column_exists? :molecules, :fp6
    add_column :molecules, :fp7, "bit(64)" unless column_exists? :molecules, :fp7
    add_column :molecules, :fp8, "bit(64)" unless column_exists? :molecules, :fp8
    add_column :molecules, :fp9, "bit(64)" unless column_exists? :molecules, :fp9
    add_column :molecules, :fp10, "bit(64)" unless column_exists? :molecules, :fp10
    add_column :molecules, :fp11, "bit(64)" unless column_exists? :molecules, :fp11
    add_column :molecules, :fp12, "bit(64)" unless column_exists? :molecules, :fp12
    add_column :molecules, :fp13, "bit(64)" unless column_exists? :molecules, :fp13
    add_column :molecules, :fp14, "bit(64)" unless column_exists? :molecules, :fp14
    add_column :molecules, :fp15, "bit(64)" unless column_exists? :molecules, :fp15

    # Populate fingerprint
    Molecule.reset_column_information
    Molecule.all.each do |molecule|
      fp_vector =
        Chemotion::OpenBabelService.fingerprint_from_molfile(molecule.molfile)

      molecule.fp0  = "%064b" % fp_vector[0]
      molecule.fp1  = "%064b" % fp_vector[1]
      molecule.fp2  = "%064b" % fp_vector[2]
      molecule.fp3  = "%064b" % fp_vector[3]
      molecule.fp4  = "%064b" % fp_vector[4]
      molecule.fp5  = "%064b" % fp_vector[5]
      molecule.fp6  = "%064b" % fp_vector[6]
      molecule.fp7  = "%064b" % fp_vector[7]
      molecule.fp8  = "%064b" % fp_vector[8]
      molecule.fp9  = "%064b" % fp_vector[9]
      molecule.fp10 = "%064b" % fp_vector[10]
      molecule.fp11 = "%064b" % fp_vector[11]
      molecule.fp12 = "%064b" % fp_vector[12]
      molecule.fp13 = "%064b" % fp_vector[13]
      molecule.fp14 = "%064b" % fp_vector[14]
      molecule.fp15 = "%064b" % fp_vector[15]

      molecule.save!
    end

  end
end
