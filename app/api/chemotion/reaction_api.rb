class OSample < OpenStruct

  def initialize data
    # set nested attributes
    %i(residues elemental_compositions).each do |prop|
      prop_value = data.delete(prop) || []
      prop_value.each { |i| i.delete :id }
      data.merge!(
        "#{prop}_attributes".to_sym => prop_value
      ) unless prop_value.blank?
    end
    data[:elemental_compositions_attributes].each { |i| i.delete(:description)} if data[:elemental_compositions_attributes]
    super
  end

  def is_new
    to_boolean super
  end

  def is_split
    to_boolean super
  end

  def to_boolean string
    !!"#{string}".match(/^(true|t|yes|y|1)$/i)
  end
end

module Chemotion
  class ReactionAPI < Grape::API
    include Grape::Kaminari

    resource :reactions do
      namespace :ui_state do
        desc "Delete reactions by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected reactions from the UI" do
            requires :all, type: Boolean
            requires :collection_id
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
          optional :options, type: Hash do
            optional :delete_subsamples, type: Boolean
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, Reaction.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          reactions = Reaction.for_user(current_user.id).for_ui_state(params[:ui_state])
          options = params[:options]

          if options && options.fetch(:delete_subsamples, false)
            reactions.flat_map(&:samples).map(&:destroy)
          end

          reactions.destroy_all
        end
      end

      desc "Return serialized reactions"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
        optional :sync_collection_id, type: Integer, desc: "SyncCollectionsUser id"
      end
      paginate per_page: 7, offset: 0

      before do
        params[:per_page].to_i > 100 && (params[:per_page] = 100)
      end

      get do
        scope = if params[:collection_id]
          begin
            Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids).
              find(params[:collection_id]).reactions
          rescue ActiveRecord::RecordNotFound
            Reaction.none
          end
        elsif params[:sync_collection_id]
          begin
            current_user.all_sync_in_collections_users.find(params[:sync_collection_id]).collection.reactions
          rescue ActiveRecord::RecordNotFound
            Reaction.none
          end
        else
          Reaction.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        paginate(scope).map{|s| ElementPermissionProxy.new(current_user, s, user_ids).serialized}
      end

      desc "Return serialized reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Reaction.find(params[:id])).read?
        end

        get do
          reaction = Reaction.find(params[:id])
          {reaction: ElementPermissionProxy.new(current_user, reaction, user_ids).serialized}
        end
      end

      desc "Delete a reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Reaction.find(params[:id])).destroy?
        end

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
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, Reaction.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Reaction.for_user(current_user.id).for_ui_state(params[:ui_state]).destroy_all
        end
      end

      desc "Update reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
        optional :name, type: String
        optional :description, type: Hash
        optional :timestamp_start, type: String
        optional :timestamp_stop, type: String
        optional :observation, type: String
        optional :purification, type: Array[String]
        optional :dangerous_products, type: Array[String]
        optional :tlc_solvents, type: String
        optional :solvent, type: String
        optional :tlc_description, type: String
        optional :rf_value, type: String
        optional :temperature, type: Hash
        optional :status, type: String
        optional :reaction_svg_file, type: String

        requires :materials, type: Hash
        optional :literatures, type: Array

        requires :container, type: Hash
      end
      route_param :id do

        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Reaction.find(params[:id])).update?
        end

        put do



          attributes = declared(params, include_missing: false).symbolize_keys
          materials = attributes.delete(:materials)
          literatures = attributes.delete(:literatures)
          id = attributes.delete(:id)

          ContainerHelper.update_datamodel(current_user, attributes[:container]);
          attributes.delete(:container);

          if reaction = Reaction.find(id)
            reaction.update_attributes!(attributes)
            reaction.touch
            ReactionUpdator.update_materials_for_reaction(reaction, materials, current_user)
            ReactionUpdator.update_literatures_for_reaction(reaction, literatures)
            reaction.reload
          end
          {reaction: ElementPermissionProxy.new(current_user, reaction, user_ids).serialized}
        end
      end

      desc "Creates reaction"
      params do
        requires :collection_id, type: Integer, desc: "Collection id"
        optional :name, type: String
        optional :description, type: Hash
        optional :timestamp_start, type: String
        optional :timestamp_stop, type: String
        optional :observation, type: String
        optional :purification, type: Array[String]
        optional :dangerous_products, type: Array[String]
        optional :tlc_solvents, type: String
        optional :solvent, type: String
        optional :tlc_description, type: String
        optional :rf_value, type: String
        optional :temperature, type: Hash
        optional :status, type: String
        optional :reaction_svg_file, type: String

        requires :materials, type: Hash
        optional :literatures, type: Array
        requires :container, type: Hash
      end

      post do
        attributes = declared(params, include_missing: false).symbolize_keys
        materials = attributes.delete(:materials)
        literatures = attributes.delete(:literatures)
        collection_id = attributes.delete(:collection_id)

        container_info = params[:container]
        attributes.delete(:container)

        collection = Collection.find(collection_id)
        attributes.assign_property(:created_by, current_user.id)
        reaction = Reaction.create!(attributes)

        reaction.container = ContainerHelper.update_datamodel(current_user, container_info)
        reaction.save!

        CollectionsReaction.create(reaction: reaction, collection: collection)
        CollectionsReaction.create(reaction: reaction, collection: Collection.get_all_collection_for_user(current_user.id))

        if reaction
          ReactionUpdator.update_materials_for_reaction(reaction, materials, current_user)
          ReactionUpdator.update_literatures_for_reaction(reaction, literatures)
          reaction.reload
          reaction
        end
      end
    end


  end
end


module ReactionUpdator
  def self.update_literatures_for_reaction(reaction, _literatures)
    current_literature_ids = reaction.literature_ids
    literatures = Array(_literatures)
    literatures.each do |literature|
      if literature.is_new
        Literature.create(reaction_id: reaction.id, title: literature.title, url: literature.url)
      else
        #todo:
        #update
      end
    end
    included_literature_ids = literatures.map(&:id)
    deleted_literature_ids = current_literature_ids - included_literature_ids
    Literature.where(reaction_id: reaction.id, id: deleted_literature_ids).destroy_all
  end

  def self.update_materials_for_reaction(reaction, material_attributes, current_user)
    collections = reaction.collections

    materials = OpenStruct.new(material_attributes)

    materials = {
      starting_material: Array(material_attributes['starting_materials']).map{|m| OSample.new(m)},
      reactant: Array(material_attributes['reactants']).map{|m| OSample.new(m)},
      solvent: Array(material_attributes['solvents']).map{|m| OSample.new(m)},
      product: Array(material_attributes['products']).map{|m| OSample.new(m)}
    }

    ActiveRecord::Base.transaction do
      included_sample_ids = []
      materials.each do |material_group, samples|
        reaction_samples_association = reaction.public_send("reactions_#{material_group}_samples")
        samples.each do |sample|
          #create new subsample
          if sample.is_new
            if sample.is_split && sample.parent_id
              parent_sample = Sample.find(sample.parent_id)

              #TODO extract subsample method
              first_collection_id = collections.first.id
              subsample = parent_sample.create_subsample current_user, first_collection_id

              if (material_group == :reactant || material_group == :solvent)
                # Use 'reactant' or 'solvent' as short_label
                subsample.short_label = sample.short_label
              end

              subsample.target_amount_value = sample.target_amount_value
              subsample.target_amount_unit = sample.target_amount_unit
              subsample.real_amount_value = sample.real_amount_value
              subsample.real_amount_unit = sample.real_amount_unit

              if ra = (sample.residues_attributes || sample.residues)
                subsample.residues_attributes =
                  ra.uniq || ra.each do |i| i.delete :id end
              end

              subsample.collections << collections.where.not(id: first_collection_id)

              #add new data container
              subsample.container = ContainerHelper.create_root_container

              subsample.save!
              subsample.reload
              included_sample_ids << subsample.id

              reaction_samples_association.create!(
                sample_id: subsample.id,
                equivalent: sample.equivalent,
                reference: sample.reference
              )
            #create new sample
            else
              attributes = sample.to_h
                .except(:id, :is_new, :is_split, :reference, :equivalent, :type, :molecule, :collection_id, :short_label)
                .merge(molecule_attributes: {molfile: sample.molecule.molfile}, created_by: current_user.id)

              # update attributes[:name] for a copied reaction
              if reaction.name.include?("Copy") && attributes[:name].present?
                named_by_reaction = "#{reaction.short_label}"
                named_by_reaction += "-#{attributes[:name].split("-").last}"
                attributes.merge!(name: named_by_reaction)
              end

              new_sample = Sample.new(
                attributes
              )

              #add new data container
              new_sample.container = ContainerHelper.create_root_container

              new_sample.collections << collections
              new_sample.save!

              reaction_samples_association.create(
                sample_id: new_sample.id,
                equivalent: sample.equivalent,
                reference: sample.reference
              )
              included_sample_ids << new_sample.id
            end
          #update the existing sample
          else
            existing_sample = Sample.find(sample.id)

            existing_sample.target_amount_value = sample.target_amount_value
            existing_sample.target_amount_unit = sample.target_amount_unit
            existing_sample.real_amount_value = sample.real_amount_value
            existing_sample.real_amount_unit = sample.real_amount_unit
            existing_sample.external_label = sample.external_label if sample.external_label
            existing_sample.short_label = sample.short_label if sample.short_label
            existing_sample.name = sample.name if sample.name

            if r = existing_sample.residues[0]
              r.assign_attributes sample.residues_attributes[0]
            end

            existing_sample.save!
            included_sample_ids << existing_sample.id

            existing_association = reaction_samples_association.find_by(sample_id: sample.id)

            #update existing associations
            if existing_association.present?
              existing_association.update_attributes!(
                equivalent: sample.equivalent,
                reference: sample.reference
              )
            #sample was moved to other materialgroup
            else
              #clear existing associations
              reaction.reactions_starting_material_samples.find_by(sample_id: sample.id).try(:destroy)
              reaction.reactions_reactant_samples.find_by(sample_id: sample.id).try(:destroy)
              reaction.reactions_solvent_samples.find_by(sample_id: sample.id).try(:destroy)
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

      #delete all samples not anymore in one of the groups

      current_sample_ids = [
        reaction.reactions_starting_material_samples.pluck(:sample_id),
        reaction.reactions_reactant_samples.pluck(:sample_id),
        reaction.reactions_solvent_samples.pluck(:sample_id),
        reaction.reactions_product_samples.pluck(:sample_id)
      ].flatten.uniq

      deleted_sample_ids = current_sample_ids - included_sample_ids
      Sample.where(id: deleted_sample_ids).destroy_all

      #for testing
      #raise ActiveRecord::Rollback
    end

    # to update the SVG
    reaction.reload
    reaction.save!
  end
end
