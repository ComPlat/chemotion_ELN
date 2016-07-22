class UpdateMoleculeFingerprint < ActiveRecord::Migration
  def change
    Molecule.all.each do |molecule|
      next if molecule.samples.count == 0

      fp_vector =
        Chemotion::OpenBabelService.fingerprint_from_molfile(molecule.samples.first.molfile, molecule.is_partial)

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

      if molecule.is_partial
        molecule.fp15 = "%064b" % (fp_vector[15] | 7)
      else
        molecule.fp15 = "%064b" % fp_vector[15]
      end

      molecule.save!
    end
  end
end
