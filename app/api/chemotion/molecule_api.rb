require 'chemotion'
module Chemotion
  class MoleculeAPI < Grape::API
    include Grape::Kaminari

    resource :molecules do

      desc "Return molecule by Molfile"
      params do
        requires :molfile, type: String, desc: "Molecule molfile"
      end
      get do
        molele = "\n  Ketcher 09211512172D 1   1.00000     0.00000     0\n\n  1  0  0     0  0            999 V2000\n    1.4250    0.9750    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\nM  END\n"
        molfile = params[:molfile]
        molecule = Molecule.find_by(molfile: molfile)
        if molecule.nil?
          molecule = Molecule.new(Molecule.valuesFromPubchemByMolfile(molfile))
        end
        molecule
      end

    end
  end
end