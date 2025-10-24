# frozen_string_literal: true

module Chemotion
  class ExplorerAPI < Grape::API

    resource :explorer do
      desc 'Fetch samples, reactions, and molecules belonging to a collection'

      params do
        requires :collection_id, type: Integer, desc: 'ID of the collection to explore'
      end

      after_validation do
        @collection = current_user
                        .collections
                        .where(is_shared: false)
                        .find_by(id: params[:collection_id])

        error!({ error: 'Collection not found' }, 404) unless @collection
      end

      get do
        samples = @collection
                    .samples
                    .select(:id, :ancestry, :molecule_id, :name, :short_label)

        # reactions = @collection
        #               .reactions
        #               .select(:id, :name, :short_label)
        reactions = @collection.reactions.includes(:reactants, :products).map do |r|
          {
            id: r.id,
            name: r.name,
            short_label: r.short_label,
            starting_material_ids: r.starting_materials.pluck(:id),
            reactant_ids: r.reactants.pluck(:id),
            product_ids:  r.products.pluck(:id)
          }
        end


        molecule_ids = samples.pluck(:molecule_id).compact.uniq
        molecules = Molecule
                      .where(id: molecule_ids)
                      .select(:id, :cano_smiles, :inchikey, :iupac_name)

        {
          samples: samples.as_json,
          reactions: reactions.as_json,
          molecules: molecules.as_json
        }
      end
    end
  end
end
