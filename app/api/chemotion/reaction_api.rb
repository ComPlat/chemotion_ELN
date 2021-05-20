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
    data[:show_label] = false if data[:show_label].blank?
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

module ReactionHelpers
  def rangebound(lower, upper)
    lower = lower.blank? ? -Float::INFINITY : BigDecimal(lower.to_s)
    upper = upper.blank? ? Float::INFINITY : BigDecimal(upper.to_s)
    if lower == -Float::INFINITY && upper == Float::INFINITY
      Range.new(-Float::INFINITY, Float::INFINITY, '()')
    else
      Range.new(lower, upper)
    end
  end

  def update_materials_for_reaction(reaction, material_attributes, current_user)
    collections = reaction.collections
    materials = OpenStruct.new(material_attributes)
    materials = {
      starting_material: Array(material_attributes['starting_materials']).map{|m| OSample.new(m)},
      reactant: Array(material_attributes['reactants']).map{|m| OSample.new(m)},
      solvent: Array(material_attributes['solvents']).map{|m| OSample.new(m)},
      purification_solvent: Array(material_attributes['purification_solvents']).map{|m| OSample.new(m)},
      product: Array(material_attributes['products']).map{|m| OSample.new(m)}
    }

    ActiveRecord::Base.transaction do
      included_sample_ids = []
      materials.each do |material_group, samples|
        fixed_label = material_group =~ /solvents?|reactants?/ && $&
        reactions_sample_klass = "Reactions#{material_group.to_s.camelize}Sample"
        samples.each_with_index do |sample, idx|
          sample.position = idx if sample.position.nil?
          sample.reference = false if material_group === 'solvent' && sample.reference == true
          #create new subsample
          if sample.is_new
            if sample.is_split && sample.parent_id
              parent_sample = Sample.find(sample.parent_id)

              #TODO extract subsample method
              subsample = parent_sample.create_subsample(current_user, collections, true)

              # Use 'reactant' or 'solvent' as short_label
              subsample.short_label = fixed_label if fixed_label

              subsample.target_amount_value = sample.target_amount_value
              subsample.target_amount_unit = sample.target_amount_unit
              subsample.real_amount_value = sample.real_amount_value
              subsample.real_amount_unit = sample.real_amount_unit
              subsample.metrics = sample.metrics

              #add new data container
              #subsample.container = create_root_container
              subsample.container = update_datamodel(sample.container) if sample.container
              subsample.save!
              subsample.reload
              subsample.save_segments(segments: parent_sample.segments, current_user_id: current_user.id)

              included_sample_ids << subsample.id
              s_id = subsample.id
            #create new sample
            else
              attributes = sample.to_h.except(
                :id, :is_new, :is_split, :reference, :equivalent, :position,
                :type, :molecule, :collection_id, :short_label, :waste, :show_label, :coefficient, :user_labels,
                :boiling_point_lowerbound, :boiling_point_upperbound,
                :melting_point_lowerbound, :melting_point_upperbound, :segments
              ).merge(created_by: current_user.id,
                      boiling_point: rangebound(sample.boiling_point_lowerbound, sample.boiling_point_upperbound),
                      melting_point: rangebound(sample.melting_point_lowerbound, sample.melting_point_upperbound))

              # update attributes[:name] for a copied reaction
              if (reaction.name || '').include?("Copy") && attributes[:name].present?
                named_by_reaction = "#{reaction.short_label}"
                named_by_reaction += "-#{attributes[:name].split("-").last}"
                attributes.merge!(name: named_by_reaction)
              end

              container_info = attributes[:container]
              attributes.delete(:container)
              attributes.delete(:segments)
              new_sample = Sample.new(
                attributes
              )

              # Use 'reactant' or 'solvent' as short_label
              new_sample.short_label = fixed_label if fixed_label

              #add new data container
              new_sample.container = update_datamodel(container_info)

              new_sample.collections << collections
              new_sample.save!
              new_sample.save_segments(segments: sample.segments, current_user_id: current_user.id)
              included_sample_ids << new_sample.id
              s_id = new_sample.id
            end
            ReactionsSample.create!(
              sample_id: s_id,
              reaction_id: reaction.id,
              equivalent: sample.equivalent,
              reference: sample.reference,
              show_label: sample.show_label,
              waste: sample.waste,
              coefficient: sample.coefficient,
              position: sample.position,
              type: reactions_sample_klass
            ) if s_id
            s_id = nil
          #update the existing sample
          else
            existing_sample = Sample.find(sample.id)

            existing_sample.target_amount_value = sample.target_amount_value
            existing_sample.target_amount_unit = sample.target_amount_unit
            existing_sample.real_amount_value = sample.real_amount_value
            existing_sample.real_amount_unit = sample.real_amount_unit
            existing_sample.metrics = sample.metrics
            existing_sample.external_label = sample.external_label if sample.external_label
            existing_sample.short_label = sample.short_label if sample.short_label
            existing_sample.short_label = fixed_label if fixed_label
            existing_sample.name = sample.name if sample.name

            if r = existing_sample.residues[0]
              r.assign_attributes sample.residues_attributes[0]
            end

            if sample.container
              existing_sample.container = update_datamodel(sample.container)
            end

            existing_sample.save!
            existing_sample.save_segments(segments: sample.segments, current_user_id: current_user.id) if sample.segments

            included_sample_ids << existing_sample.id

            existing_association = ReactionsSample.find_by(sample_id: sample.id)

            #update existing associations
            if existing_association
              existing_association.update_attributes!(
                reaction_id: reaction.id,
                equivalent: sample.equivalent,
                reference: sample.reference,
                show_label: sample.show_label,
                waste: sample.waste,
                coefficient: sample.coefficient,
                position: sample.position,
                type: reactions_sample_klass
              )
            #sample was moved to other materialgroup
            else
              #create a new association
              ReactionsSample.create!(
                sample_id: sample.id,
                reaction_id: reaction.id,
                equivalent: sample.equivalent,
                reference: sample.reference,
                show_label: sample.show_label,
                waste: sample.waste,
                coefficient: sample.coefficient,
                position: sample.position,
                type: reactions_sample_klass
              )
            end
          end
        end
      end

      #delete all samples not anymore in one of the groups

      current_sample_ids = reaction.reactions_samples.pluck(:sample_id)
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

module Chemotion
  class ReactionAPI < Grape::API
    include Grape::Extensions::Hashie::Mash::ParamBuilder
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ReactionHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers LiteratureHelpers
    helpers ProfileHelpers

    resource :reactions do
      namespace :import_chemscanner do
        desc 'Import Reactions'
        params do
          requires :reactions, type: Array, desc: 'List of reactions to import'
          requires :molecules, type: Array, desc: 'List of molecules to import'
          requires :collection_id, type: Integer, desc: 'Collection id'
        end

        after_validation do
          unless current_user.collections.find(params[:collection_id])
            error!('401 Unauthorized', 401)
          end
        end

        post do
          Import::FromChemScanner.from_list(
            params[:reactions],
            params[:molecules],
            current_user.id,
            params[:collection_id]
          )

          true
        end
      end

      desc "Return serialized reactions"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
        optional :sync_collection_id, type: Integer, desc: "SyncCollectionsUser id"
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
      end
      paginate per_page: 7, offset: 0

      before do
        params[:per_page].to_i > 100 && (params[:per_page] = 100)
      end

      get do
        scope = if params[:collection_id]
          begin
            Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
              .find(params[:collection_id])
              .reactions
          rescue ActiveRecord::RecordNotFound
            Reaction.none
          end
        elsif params[:sync_collection_id]
          begin
            current_user.all_sync_in_collections_users.find(params[:sync_collection_id])
              .collection.reactions
          rescue ActiveRecord::RecordNotFound
            Reaction.none
          end
        else
          Reaction.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.includes(:tag, collections: :sync_collections_users).order("created_at DESC")

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        paginate(scope).map{|s| ElementListPermissionProxy.new(current_user, s, user_ids).serialized}
      end

      desc "Return serialized reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
      end
      route_param :id do
        before do
          @element_policy = ElementPolicy.new(current_user, Reaction.find(params[:id]))
          error!('401 Unauthorized', 401) unless @element_policy.read?
        end

        get do
          reaction = Reaction.find(params[:id])
          { reaction: ElementPermissionProxy.new(current_user, reaction, user_ids, @element_policy).serialized, literatures: citation_for_elements(params[:id], 'Reaction') }
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

      # ??
      # desc "Delete reactions by UI state"
      # params do
      #   requires :ui_state, type: Hash, desc: "Selected reactions from the UI"
      # end
      # route_param :id do
      #   before do
      #     @reactions = Reaction.for_user(current_user.id).by_ui_state(params[:ui_state])
      #     error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @reactions).destroy?
      #   end
      #
      #   delete do
      #     @reactions.destroy_all
      #   end
      # end

      desc "Update reaction by id"
      params do
        requires :id, type: Integer, desc: "Reaction id"
        optional :name, type: String
        optional :description, type: Hash
        optional :timestamp_start, type: String
        optional :timestamp_stop, type: String
        optional :observation, type: Hash
        optional :purification, type: Array[String]
        optional :dangerous_products, type: Array[String]
        optional :conditions, type: String
        optional :tlc_solvents, type: String
        optional :solvent, type: String
        optional :tlc_description, type: String
        optional :rf_value, type: String
        optional :temperature, type: Hash
        optional :status, type: String
        optional :role, type: String
        optional :origin, type: Hash
        optional :reaction_svg_file, type: String

        requires :materials, type: Hash
        optional :literatures, type: Hash

        requires :container, type: Hash
        optional :duration, type: String
        optional :rxno, type: String
        optional :segments, type: Array
      end
      route_param :id do

        after_validation do
          @reaction = Reaction.find_by(id: params[:id])
          @element_policy = ElementPolicy.new(current_user, @reaction)
          error!('401 Unauthorized', 401) unless @reaction && @element_policy.update?
        end

        put do
          reaction = @reaction
          attributes = declared(params, include_missing: false).symbolize_keys
          materials = attributes.delete(:materials)
          literatures = attributes.delete(:literatures)
          id = attributes.delete(:id)

          update_datamodel(attributes[:container])
          attributes.delete(:container)
          attributes.delete(:segments)

          reaction.update_attributes!(attributes)
          reaction.touch
          update_materials_for_reaction(reaction, materials, current_user)
          # update_literatures_for_reaction(reaction, literatures)
          reaction.save_segments(segments: params[:segments], current_user_id: current_user.id)
          reaction.reload
          recent_ols_term_update('rxno', [params[:rxno]]) if params[:rxno].present?
          #save to profile
          kinds = reaction.container&.analyses&.pluck("extended_metadata->'kind'")
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          {reaction: ElementPermissionProxy.new(current_user, reaction, user_ids, @element_policy).serialized}
        end
      end

      desc 'Creates reaction'
      params do
        requires :collection_id, type: Integer, desc: 'Collection id'
        optional :name, type: String
        optional :description, type: Hash
        optional :timestamp_start, type: String
        optional :timestamp_stop, type: String
        optional :observation, type: Hash
        optional :purification, type: Array[String]
        optional :dangerous_products, type: Array[String]
        optional :conditions, type: String
        optional :tlc_solvents, type: String
        optional :solvent, type: String
        optional :tlc_description, type: String
        optional :rf_value, type: String
        optional :temperature, type: Hash
        optional :status, type: String
        optional :role, type: String
        optional :origin, type: Hash
        optional :reaction_svg_file, type: String
        optional :segments, type: Array
        requires :materials, type: Hash
        optional :literatures, type: Hash
        requires :container, type: Hash
        optional :duration, type: String
        optional :rxno, type: String
      end

      post do
        attributes = declared(params, include_missing: false).symbolize_keys
        materials = attributes.delete(:materials)
        literatures = attributes.delete(:literatures)
        attributes.delete(:can_copy)
        collection_id = attributes.delete(:collection_id)
        container_info = params[:container]
        attributes.delete(:container)
        attributes.delete(:segments)

        collection = Collection.find(collection_id)
        attributes.assign_property(:created_by, current_user.id)
        reaction = Reaction.create!(attributes)
        recent_ols_term_update('rxno', [params[:rxno]]) if params[:rxno].present?

        if literatures.present?
          literatures.each do |literature|
            next unless literature&.length > 1

            refs = literature[1].refs
            doi = literature[1].doi
            url = literature[1].url
            title = literature[1].title
            isbn = literature[1].isbn

            lit = Literature.find_or_create_by(doi: doi, url: url, title: title, isbn: isbn)
            lit.update!(refs: (lit.refs || {}).merge(declared(refs))) if refs

            lattributes = {
              literature_id: lit.id,
              user_id: current_user.id,
              element_type: 'Reaction',
              element_id: reaction.id,
              category: 'detail'
            }
            unless Literal.find_by(lattributes)
              Literal.create(lattributes)
              reaction.touch
            end
          end
        end
        reaction.container = update_datamodel(container_info)
        reaction.save!
        reaction.save_segments(segments: params[:segments], current_user_id: current_user.id)
        CollectionsReaction.create(reaction: reaction, collection: collection)
        CollectionsReaction.create(reaction: reaction, collection: Collection.get_all_collection_for_user(current_user.id))
        CollectionsReaction.update_tag_by_element_ids(reaction.id)
        if reaction
          if attributes['origin']&.short_label
            materials.products&.map! do |prod|
              prod.name&.gsub! params['short_label'], reaction.short_label
              prod.name&.gsub! attributes['origin'].short_label, reaction.short_label
              prod
            end
          end

          update_materials_for_reaction(reaction, materials, current_user)
          # update_literatures_for_reaction(reaction, literatures)
          reaction.reload

          # save to profile
          kinds = reaction.container&.analyses&.pluck("extended_metadata->'kind'")
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          { reaction: ElementPermissionProxy.new(current_user, reaction, user_ids).serialized }
        end
      end
    end
  end
end
