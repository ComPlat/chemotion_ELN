# frozen_string_literal: true

<<<<<<< HEAD
# rubocop:disable Metrics/ClassLength
=======
# Sample Structure
class OSample < OpenStruct
  def initialize(data)
    # set nested attributes

    %w[residues elemental_compositions].each do |prop|
      prop_value = data.delete(prop) || []

      prop_value.each { |i| i.delete :id }

      data.merge!(
        "#{prop}_attributes" => prop_value
      ) unless prop_value.blank?
    end

    data['elemental_compositions_attributes'].each { |i| i.delete('description') } if data['elemental_compositions_attributes']
    data['show_label'] = false if data['show_label'].blank?
    super
  end

  def is_new
    to_boolean super
  end

  def is_split
    to_boolean super
  end

  def to_boolean(string)
    !!"#{string}".match(/^(true|t|yes|y|1)$/i)
  end
end

# Reaction Helper
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
      starting_material: Array(material_attributes['starting_materials']).map { |m| OSample.new(m) },
      reactant: Array(material_attributes['reactants']).map { |m| OSample.new(m) },
      solvent: Array(material_attributes['solvents']).map { |m| OSample.new(m) },
      purification_solvent: Array(material_attributes['purification_solvents']).map { |m| OSample.new(m) },
      product: Array(material_attributes['products']).map { |m| OSample.new(m) }
    }
    ActiveRecord::Base.transaction do
      included_sample_ids = []
      materials.each do |material_group, samples|
        fixed_label = material_group =~ /solvents?|reactants?/ && $&
        reactions_sample_klass = "Reactions#{material_group.to_s.camelize}Sample"
        samples.each_with_index do |sample, idx|
          sample.position = idx if sample.position.nil?
          sample.reference = false if material_group === 'solvent' && sample.reference == true
          # create new subsample
          if sample.is_new
            if sample.parent_id && material_group != 'products'
              parent_sample = Sample.find(sample.parent_id)

              # TODO: extract subsample method
              subsample = parent_sample.create_subsample(current_user, collections, true)

              # Use 'reactant' or 'solvent' as short_label
              subsample.short_label = fixed_label if fixed_label

              subsample.target_amount_value = sample.target_amount_value
              subsample.target_amount_unit = sample.target_amount_unit
              subsample.real_amount_value = sample.real_amount_value
              subsample.real_amount_unit = sample.real_amount_unit
              subsample.metrics = sample.metrics
              subsample.rf_value = sample.rf_value
              # add new data container
              # subsample.container = create_root_container
              subsample.container = update_datamodel(sample.container) if sample.container
              subsample.save!
              subsample.reload
              subsample.save_segments(segments: parent_sample.segments, current_user_id: current_user.id)

              included_sample_ids << subsample.id
              s_id = subsample.id
            # create new sample
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
              if (reaction.name || '').include?('Copy') && attributes[:name].present?
                named_by_reaction = "#{reaction.short_label}"
                named_by_reaction += "-#{attributes[:name].split('-').last}"
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

              # add new data container
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
          # update the existing sample
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
            existing_sample.rf_value = sample.rf_value if sample.rf_value

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

            # update existing associations
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
            # sample was moved to other materialgroup
            else
              # create a new association
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

      # delete all samples not anymore in one of the groups

      current_sample_ids = reaction.reactions_samples.pluck(:sample_id)
      deleted_sample_ids = current_sample_ids - included_sample_ids
      Sample.where(id: deleted_sample_ids).destroy_all

      # for testing
      # raise ActiveRecord::Rollback
    end

    # to update the SVG
    reaction.reload
    reaction.save!
  end
end

>>>>>>> add rf_value tlc_solvents sample property in reaction properties and sample property
module Chemotion
  # Reaction API
  class ReactionAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers LiteratureHelpers
    helpers ProfileHelpers

    resource :reactions do
      desc 'Return serialized reactions'
      params do
        optional :collection_id, type: Integer, desc: 'Collection id'
        optional :sync_collection_id, type: Integer, desc: 'SyncCollectionsUser id'
        optional :from_date, type: Integer, desc: 'created_date from in ms'
        optional :to_date, type: Integer, desc: 'created_date to in ms'
        optional :filter_created_at, type: Boolean, desc: 'filter by created at or updated at'
        optional :sort_column, type: String, desc: 'sort by created_at, updated_at, rinchi_short_key, or rxno',
                               values: %w[created_at updated_at rinchi_short_key rxno],
                               default: 'created_at'
        optional :sort_direction, type: String, desc: 'sort direction',
                                  values: %w[ASC DESC]
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
                  Reaction.joins(:collections).where(collections: { user_id: current_user.id }).distinct
                end

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        sort_column = params[:sort_column].presence || 'created_at'
        sort_direction = params[:sort_direction].presence ||
                         (%w[created_at updated_at].include?(sort_column) ? 'DESC' : 'ASC')

        scope = scope.includes_for_list_display.order("#{sort_column} #{sort_direction}")
        scope = scope.created_time_from(Time.at(from)) if from && by_created_at
        scope = scope.created_time_to(Time.at(to) + 1.day) if to && by_created_at
        scope = scope.updated_time_from(Time.at(from)) if from && !by_created_at
        scope = scope.updated_time_to(Time.at(to) + 1.day) if to && !by_created_at

        reset_pagination_page(scope)

        reactions = paginate(scope).map do |reaction|
          Entities::ReactionEntity.represent(
            reaction,
            displayed_in_list: true,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels,
          )
        end

        { reactions: reactions }
      end

      desc 'Return serialized reaction by id'
      params do
        requires :id, type: Integer, desc: 'Reaction id'
      end
      route_param :id do
        after_validation do
          @element_policy = ElementPolicy.new(current_user, Reaction.find(params[:id]))
          error!('401 Unauthorized', 401) unless @element_policy.read?
        rescue ActiveRecord::RecordNotFound
          error!('404 Not Found', 404)
        end

        get do
          reaction = Reaction.find(params[:id])
          class_name = reaction&.class&.name

          {
            reaction: Entities::ReactionEntity.represent(
              reaction,
              policy: @element_policy,
              detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels,
            ),
            literatures: Entities::LiteratureEntity.represent(citation_for_elements(params[:id], class_name)),
          }
        end
      end

      # Endpoint does not seem to be called from JS.
      # ReactionsFetcher has no corresponding method
      desc 'Delete a reaction by id'
      params do
        requires :id, type: Integer, desc: 'Reaction id'
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, Reaction.find(params[:id])).destroy?
        end

        delete do
          Reaction.find(params[:id]).destroy
        end
      end

      namespace :findByShortLabel do
        desc 'Fetch reaction id and collection based on short label'
        params do
          requires :short_label, type: String, desc: 'Unique short label of sample'
        end
        route_param :short_label do
          get do
            finder = Usecases::Reactions::FindByShortLabel.new(params[:short_label], current_user)

            finder.result
          end
        end
      end

      desc 'Update reaction by id'
      params do
        requires :id, type: Integer, desc: 'Reaction id'
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
        optional :variations, type: [Hash]
      end
      route_param :id do
        after_validation do
          @reaction = Reaction.find_by(id: params[:id])
          @element_policy = ElementPolicy.new(current_user, @reaction)
          error!('401 Unauthorized', 401) unless @reaction && @element_policy.update?
        end

        put do
          reaction = @reaction
          attributes = declared(params, include_missing: false)
          materials = attributes.delete(:materials)
          attributes.delete(:literatures)
          attributes.delete(:id)

          update_datamodel(attributes[:container])
          attributes.delete(:container)
          attributes.delete(:segments)

          reaction.update!(attributes)
          reaction.touch
          reaction = Usecases::Reactions::UpdateMaterials.new(reaction, materials, current_user).execute!
          reaction.save_segments(segments: params[:segments], current_user_id: current_user.id)
          reaction.reload
          recent_ols_term_update('rxno', [params[:rxno]]) if params[:rxno].present?
          # save to profile
          kinds = reaction.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          present(
            reaction,
            with: Entities::ReactionEntity,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels,
            root: :reaction,
            policy: @element_policy,
          )
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
        optional :variations, type: [Hash]
      end

      post do
        attributes = declared(params, include_missing: false)
        materials = attributes.delete(:materials)
        literatures = attributes.delete(:literatures)
        attributes.delete(:can_copy)
        collection_id = attributes.delete(:collection_id)
        container_info = params[:container]
        attributes.delete(:container)
        attributes.delete(:segments)

        collection = current_user.collections.where(id: collection_id).take
        attributes[:created_by] = current_user.id
        reaction = Reaction.create!(attributes)
        recent_ols_term_update('rxno', [params[:rxno]]) if params[:rxno].present?

        if literatures.present?
          literatures.each do |literature|
            next unless literature&.length&.> 1

            refs = literature[1][:refs]
            doi = literature[1][:doi]
            url = literature[1][:url]
            title = literature[1][:title]
            isbn = literature[1][:isbn]

            lit = Literature.find_or_create_by(doi: doi, url: url, title: title, isbn: isbn)
            lit.update!(refs: (lit.refs || {}).merge(declared(refs))) if refs

            lattributes = {
              literature_id: lit.id,
              user_id: current_user.id,
              element_type: 'Reaction',
              element_id: reaction.id,
              category: 'detail',
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
        CollectionsReaction.create(reaction: reaction, collection: collection) if collection.present?

        is_shared_collection = false
        if collection.blank?
          sync_collection = current_user.all_sync_in_collections_users.where(id: collection_id).take
          if sync_collection.present?
            is_shared_collection = true
            sync_in_collection_receiver = Collection.find(sync_collection['collection_id'])
            CollectionsReaction.create(reaction: reaction,
                                       collection: sync_in_collection_receiver)
            sync_out_collection_sharer = Collection.get_all_collection_for_user(sync_collection['shared_by_id'])
            CollectionsReaction.create(reaction: reaction,
                                       collection: sync_out_collection_sharer)
          end
        end

        unless is_shared_collection
          CollectionsReaction.create(reaction: reaction,
                                     collection: Collection.get_all_collection_for_user(current_user.id))
        end
        CollectionsReaction.update_tag_by_element_ids(reaction.id)
        if reaction
          if attributes['origin'] && attributes['origin']['short_label'] && materials['products'].present?
            materials['products'].map! do |prod|
              prod[:name]&.gsub! params['short_label'], reaction.short_label if params['short_label']
              prod[:name]&.gsub! attributes['origin']['short_label'], reaction.short_label
              prod
            end
          end

          reaction = Usecases::Reactions::UpdateMaterials.new(reaction, materials, current_user).execute!
          reaction.reload

          # save to profile
          kinds = reaction.container&.analyses&.pluck(Arel.sql("extended_metadata->'kind'"))
          recent_ols_term_update('chmo', kinds) if kinds&.length&.positive?

          present(
            reaction,
            with: Entities::ReactionEntity,
            detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels,
            root: :reaction,
          )
        end
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength
