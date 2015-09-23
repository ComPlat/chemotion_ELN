require 'chemotion'
module Chemotion
  class MoleculeAPI < Grape::API
    include Grape::Kaminari

    resource :molecules do

      desc "Return molecule by Molfile"
      params do
        requires :molfile, type: String, desc: "Molecule molfile"
      end
      post do
        Molecule.find_or_create_by_molfile(params[:molfile])
      end

    end
  end
end