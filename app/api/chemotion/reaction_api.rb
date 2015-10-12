module Chemotion
  class ReactionAPI < Grape::API
    include Grape::Kaminari

    resource :reactions do
      namespace :ui_state do
        desc "Delete reactions by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected reactions from the UI" do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Reaction.for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Reaction.for_ui_state(params[:ui_state]).destroy_all
        end
      end

      desc "Return serialized reactions"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, max_per_page: 25, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).reactions
        else
          Reaction.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        paginate(scope)
      end

      desc "Return serialized reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Reaction.find(params[:id])).read?
        end

        get do
          Reaction.find(params[:id])
        end
      end

      desc "Delete a reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
      end
      route_param :id do
        delete do
          Reaction.find(params[:id]).destroy
        end
      end

      desc "Delete reactions by UI state"
      params do
        requires :ui_state, type: Hash, desc: "Selected reactions from the UI"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Reaction.find(params[:id])).destroy?
        end

        delete do
          Reaction.for_ui_state(params[:ui_state]).destroy_all
        end
      end

      desc "Update reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
        optional :name, type: String
        optional :description, type: String
        optional :timestamp_start, type: String
        optional :timestamp_stop, type: String
        optional :observation, type: String
        optional :purification, type: Array, default: []
        optional :dangerous_products, type: Array, default: []
        optional :solvents, type: String
        optional :tlc_description, type: String
        optional :rf_value, type: String
        optional :temperature, type: String
        optional :status, type: String
        optional :reaction_svg_file, type: String

        requires :materials, type: Hash
        #optional :literatures, type: Array, default: []
      end
      route_param :id do

        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Reaction.find(params[:id])).update?
        end

        put do
          attributes = declared(params, include_missing: false).symbolize_keys
          materials = attributes.delete(:materials)
          id = attributes.delete(:id)

          if reaction = Reaction.find(id)
            reaction.update_attributes(attributes)
            ReactionUpdator.update_materials_for_reaction(reaction, materials)
            reaction.reload
            reaction
          end
        end
      end

      desc "Creates reaction"
      params do
        requires :collection_id, type: Integer, desc: "Collection id"
        optional :name, type: String
        optional :description, type: String
        optional :timestamp_start, type: String
        optional :timestamp_stop, type: String
        optional :observation, type: String
        optional :purification, type: Array, default: []
        optional :dangerous_products, type: Array, default: []
        optional :solvents, type: String
        optional :tlc_description, type: String
        optional :rf_value, type: String
        optional :temperature, type: String
        optional :status, type: String
        optional :reaction_svg_file, type: String

        requires :materials, type: Hash
      end

      # before do
      #   error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Reaction).create?
      # end

      post do
        attributes = declared(params, include_missing: false).symbolize_keys
        materials = attributes.delete(:materials)
        collection_id = attributes.delete(:collection_id)

        collection = Collection.find(collection_id)
        reaction = Reaction.create(attributes)

        CollectionsReaction.create(reaction: reaction, collection: collection)
        if reaction
          ReactionUpdator.update_materials_for_reaction(reaction, materials)
          reaction.reload
          reaction
        end
      end
    end


  end
end


module ReactionUpdator

  def self.update_materials_for_reaction(reaction, material_attributes)
    #todo: is this correct to set it to the first collection?
    collection_id = reaction.collections.first.id

    materials = OpenStruct.new(material_attributes)

    materials = {
      starting_material: Array(material_attributes['starting_materials']).map{|m| OpenStruct.new(m)},
      reactant: Array(material_attributes['reactants']).map{|m| OpenStruct.new(m)},
      product: Array(material_attributes['products']).map{|m| OpenStruct.new(m)}
    }

    ActiveRecord::Base.transaction do
      materials.each do |material_group, samples|
        reaction_samples_association = reaction.public_send("reactions_#{material_group}_samples")
        samples.each do |sample|

          if sample.is_new && sample.parent_id

            parent_sample = Sample.find(sample.parent_id)

            subsample = parent_sample.dup
            subsample.parent = parent_sample

            subsample.name = sample.name
            subsample.amount_value = sample.amount_value
            subsample.amount_unit = sample.amount_unit

            subsample.id
            subsample.save

            #assign subsample to current collection
            CollectionsSample.create(collection_id: collection_id, sample_id: subsample.id)

            reaction_samples_association.create(
              sample_id: subsample.id,
              equivalent: sample.equivalent,
              reference: sample.reference
            )
          else
            existing_sample = Sample.find(sample.id)

            existing_sample.amount_value = sample.amount_value
            existing_sample.amount_unit = sample.amount_unit
            existing_sample.save

            existing_association = reaction_samples_association.find_by(sample_id: sample.id)

            #update existing associations
            if existing_association.present?
              existing_association.update_attributes(
                equivalent: sample.equivalent,
                reference: sample.reference
              )
            else
              #clear existing associations
              reaction.reactions_starting_material_samples.find_by(sample_id: sample.id).try(:destroy)
              reaction.reactions_reactant_samples.find_by(sample_id: sample.id).try(:destroy)
              reaction.reactions_product_samples.find_by(sample_id: sample.id).try(:destroy)

              #create a new association
              reaction_samples_association.create(
                sample_id: sample.id,
                equivalent: sample.equivalent,
                reference: sample.reference
              )
            end

          end
        end
      end
      #for testing
      #raise ActiveRecord::Rollback
    end

    # to update the SVG
    reaction.reload
    reaction.save
  end
end
