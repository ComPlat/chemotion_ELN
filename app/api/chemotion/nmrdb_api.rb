module Chemotion
  class NmrdbAPI < Grape::API
    include Grape::Kaminari

    resource :simulation do
      resource :nmrdb do
        desc "Return Nmrdb Simulation by molecule_id"
        params do
          requires :molecule_id, type: Integer, desc: "Molecule id"
        end
        get do
          molecule_id = params[:molecule_id]
          simulation(molecule_id).result
        end
      end
    end

    helpers do
      def simulation(molecule_id)
        simulation = NmrSimulation.find_by(molecule_id: molecule_id, source: "nmrdb")
        return completed(simulation, molecule_id)
      end

      def completed(simulation, molecule_id)
        if !simulation
          return create_simulation(molecule_id)
        elsif simulation.invalid_file
          return update_simulation(simulation, molecule_id)
        else
          return simulation
        end
      end

      def create_simulation(molecule_id)
        molecule = Molecule.find(molecule_id)
        simulation = molecule.nmr_simulations.create(source: "nmrdb")
        simulation.save && simulation
      end

      def update_simulation(simulation, molecule_id)
        molecule = Molecule.find(molecule_id)
        simulation.update(source: 'nmrdb') && simulation
      end
    end

  end
end
