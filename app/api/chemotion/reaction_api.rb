# frozen_string_literal: true

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
                end.order('created_at DESC')

        from = params[:from_date]
        to = params[:to_date]
        by_created_at = params[:filter_created_at] || false

        scope = scope.includes_for_list_display
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
        before do
          @element_policy = ElementPolicy.new(current_user, Reaction.find(params[:id]))
          error!('401 Unauthorized', 401) unless @element_policy.read?
        end

        get do
          reaction = Reaction.find(params[:id])

          {
            reaction: Entities::ReactionEntity.represent(
              reaction,
              policy: @element_policy,
              detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels,
            ),
            literatures: Entities::LiteratureEntity.represent(citation_for_elements(params[:id], 'Reaction')),
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
