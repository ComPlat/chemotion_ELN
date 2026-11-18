module Chemotion
  class NmrdbAPI < Grape::API
    include Grape::Kaminari

    resource :simulation do
      resource :nmrdb do
        desc 'Return Nmrdb Simulation by molecule_id'
        params do
          requires :molecule_id, type: Integer, desc: 'Molecule id'
        end
        get do
          molecule_id = params[:molecule_id]
          simulation(molecule_id).result
        end
      end
    end

    helpers do
      # Reuses a soft-deleted simulation, as the unique index on (molecule_id, source) still covers it.
      def simulation(molecule_id)
        molecule = Molecule.find(molecule_id)
        simulation = NmrSimulation.with_deleted.find_or_initialize_by(molecule: molecule, source: 'nmrdb')
        simulation.deleted_at = nil
        simulation.save! if simulation.changed? || simulation.invalid_file
        simulation
      end
    end
  end
end
