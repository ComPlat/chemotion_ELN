module Chemotion
  # rubocop: disable Metrics/ClassLength, Style/MultilineIfModifier, Layout/MultilineMethodCallBraceLayout

  class CollectionAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers
    resource :collections do

      namespace :all do
        desc "Return the 'All' collection of the current user"
        get do
          present Collection.get_all_collection_for_user(current_user.id), with: Entities::CollectionEntity, root: :collection
        end
      end

      desc "Return collection by id"
      params do
        requires :id, type: Integer, desc: "Collection id"
      end
      route_param :id, requirements: { id: /[0-9]*/ } do
        get do
          present Collection.find(params[:id]), with: Entities::CollectionEntity, root: :collection
        end

        desc "Return collection metadata"
        rescue_from ActiveRecord::RecordNotFound do
          error!('401 Unauthorized', 401)
        end
        before do
          error!('401 Unauthorized', 401) unless CollectionPolicy.new(current_user, Collection.find(params[:id])).read_metadata?
        end
        get :metadata do
          metadata = Metadata.where(collection_id: params[:id]).first
          if metadata
            metadata
          else
            error!('404 Not Found', 404)
          end
        end

        desc "Create/update collection metadata"
        rescue_from ActiveRecord::RecordNotFound do
          error!('401 Unauthorized', 401)
        end
        params do
          requires :metadata, type: JSON
        end
        before do
          error!('401 Unauthorized', 401) unless CollectionPolicy.new(current_user, Collection.find(params[:id])).update_metadata?
        end
        post :metadata do
          metadata = Metadata.where(collection_id: params[:id]).first
          unless metadata
            metadata = Metadata.new(collection_id: params[:id])
          end
          metadata.metadata = params[:metadata]
          metadata.save!
          metadata
        end
      end

      namespace :take_ownership do
        desc "Take ownership of collection with specified id"
        params do
          requires :id, type: Integer, desc: "Collection id"
        end
        route_param :id do
          before do
            error!('401 Unauthorized', 401) unless CollectionPolicy.new(current_user, Collection.find(params[:id])).take_ownership?
          end

          post do
            Usecases::Sharing::TakeOwnership.new(params.merge(current_user_id: current_user.id)).execute!
          end
        end
      end

      desc "Return all locked and unshared serialized collection roots of current user"
      get :locked do
        roots = current_user.collections.includes(:shared_users).locked.unshared.roots.order(label: :asc)

        present roots, with: Entities::CollectionEntity, root: :collections
      end

      get_child = Proc.new do |children, collects|
        children.each do |obj|
          child = collects.select { |dt| dt['ancestry'] == obj['ancestry_root']}
          get_child.call(child, collects) if child.count>0
          obj[:children] = child
        end
      end

      build_tree = Proc.new do |collects, delete_empty_root|
        col_tree = []
        collects.collect{ |obj| col_tree.push(obj) if obj['ancestry'].nil? }
        get_child.call(col_tree,collects)
        col_tree.select! { |col| col[:children].count > 0 } if delete_empty_root
        Entities::CollectionRootEntity.represent(col_tree, serializable: true, root: :collections)
      end

      desc "Return all unlocked unshared serialized collection roots of current user"
      get :roots do
        collects = Collection.includes(:inventory).where(user_id: current_user.id).unlocked.unshared
                             .order('id').select(
          <<~SQL
            collections.id, label, ancestry, is_synchronized, permission_level, tabs_segment, position, collection_shared_names(user_id, collections.id) as shared_names,
            reaction_detail_level, sample_detail_level, screen_detail_level, wellplate_detail_level, element_detail_level, is_locked, is_shared, inventory_id,
            case when (ancestry is null) then cast(collections.id as text) else concat(ancestry, chr(47), collections.id) end as ancestry_root
          SQL
        ).as_json(methods: %i[inventory_name inventory_prefix])
        build_tree.call(collects, false)
      end

      desc "Return all shared serialized collections"
      get :shared_roots do
        collects = Collection.includes(:inventory).shared(current_user.id)
                             .order('id').select(
          <<~SQL
            collections.id, user_id, label, ancestry, permission_level, user_as_json(user_id) as shared_to,
            is_shared, is_locked, is_synchronized, false as is_remoted, tabs_segment, inventory_id,
            reaction_detail_level, sample_detail_level, screen_detail_level, wellplate_detail_level, element_detail_level,
            case when (ancestry is null) then cast(collections.id as text) else concat(ancestry, chr(47), collections.id) end as ancestry_root
          SQL
        ).as_json(methods: %i[inventory_name inventory_prefix])
        build_tree.call(collects, true)
      end

      desc "Return all remote serialized collections"
      get :remote_roots do
        collects = Collection.includes(:inventory).remote(current_user.id)
                             .where(user_id: current_user.id).order(:id).select(
          <<~SQL
            collections.id, user_id, label, ancestry, permission_level, user_as_json(shared_by_id) AS shared_by, tabs_segment,
            CASE WHEN ancestry IS NULL THEN CAST(collections.id AS TEXT) ELSE CONCAT(ancestry, '/', collections.id) END AS ancestry_root,
            reaction_detail_level, sample_detail_level, screen_detail_level, wellplate_detail_level, is_locked, is_shared, inventory_id,
            shared_user_as_json(user_id, #{current_user.id}) AS shared_to,
            position
          SQL
        ).as_json(methods: %i[inventory_name inventory_prefix])
        build_tree.call(collects, true)
      end

      # TODO: check if this endpoint is really obsolete
      desc "Bulk update and/or create new collections"
      patch '/' do
        Collection.bulk_update(current_user.id, params[:collections].as_json(except: :descendant_ids), params[:deleted_ids])
      end

      desc "reject a shared collections"
      patch '/reject_shared' do
        Collection.reject_shared(current_user.id, params[:id])
        {} # result is not used by FE
      end

      namespace :shared do
        desc "Update shared collection"
        params do
          requires :id, type: Integer
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
            requires :screen_detail_level, type: Integer
            optional :research_plan_detail_level, type: Integer
            optional :element_detail_level, type: Integer
          end
        end

        put ':id' do
          Collection.shared(current_user.id).find(params[:id]).update!(params[:collection_attributes])
          {} # result is not used by FE
        end

        desc "Create shared collections"
        params do
          requires :elements_filter, type: Hash do
            requires :sample, type: Hash do
              use :ui_state_params
            end
            requires :reaction, type: Hash do
              use :ui_state_params
            end
            requires :wellplate, type: Hash do
              use :ui_state_params
            end
            requires :screen, type: Hash do
              use :ui_state_params
            end
            optional :research_plan, type: Hash do
              use :ui_state_params
            end
            optional :cell_line, type: Hash do
              use :ui_state_params
            end
          end
          requires :collection_attributes, type: Hash do
            requires :permission_level, type: Integer
            requires :sample_detail_level, type: Integer
            requires :reaction_detail_level, type: Integer
            requires :wellplate_detail_level, type: Integer
            requires :screen_detail_level, type: Integer
            optional :research_plan_detail_level, type: Integer
          end
          requires :user_ids, type: Array do
            requires :value
          end
          requires :currentCollection, type: Hash do
            requires :id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
        end

        after_validation do
          @cid = fetch_collection_id_w_current_user(params[:currentCollection][:id], params[:currentCollection][:is_sync_to_me])
          samples = Sample.by_collection_id(@cid).by_ui_state(params[:elements_filter][:sample]).for_user_n_groups(user_ids)
          reactions = Reaction.by_collection_id(@cid).by_ui_state(params[:elements_filter][:reaction]).for_user_n_groups(user_ids)
          wellplates = Wellplate.by_collection_id(@cid).by_ui_state(params[:elements_filter][:wellplate]).for_user_n_groups(user_ids)
          screens = Screen.by_collection_id(@cid).by_ui_state(params[:elements_filter][:screen]).for_user_n_groups(user_ids)
          research_plans = ResearchPlan.by_collection_id(@cid).by_ui_state(params[:elements_filter][:research_plan]).for_user_n_groups(user_ids)
          cell_lines = CelllineSample.by_collection_id(@cid)
                                     .by_ui_state(params[:elements_filter][:cell_line])
                                     .for_user_n_groups(user_ids)
          elements = {}
          Labimotion::ElementKlass.find_each do |klass|
            elements[klass.name] = Labimotion::Element.by_collection_id(@cid).by_ui_state(params[:elements_filter][klass.name]).for_user_n_groups(user_ids)
          end
          top_secret_sample = samples.pluck(:is_top_secret).any?
          top_secret_reaction = reactions.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_wellplate = wellplates.flat_map(&:samples).map(&:is_top_secret).any?
          top_secret_screen = screens.flat_map(&:wellplates).flat_map(&:samples).map(&:is_top_secret).any?

          is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction || top_secret_screen
          share_samples = ElementsPolicy.new(current_user, samples).share?
          share_reactions = ElementsPolicy.new(current_user, reactions).share?
          share_wellplates = ElementsPolicy.new(current_user, wellplates).share?
          share_screens = ElementsPolicy.new(current_user, screens).share?
          share_research_plans = ElementsPolicy.new(current_user, research_plans).share?
          share_cell_lines = ElementsPolicy.new(current_user, cell_lines).share?
          share_elements = !(elements&.length > 0)
          elements.each do |k, v|
            share_elements = ElementsPolicy.new(current_user, v).share?
            break unless share_elements
          end

          sharing_allowed = share_samples &&
                            share_reactions &&
                            share_wellplates &&
                            share_screens &&
                            share_research_plans &&
                            share_cell_lines &&
                            share_elements
          error!('401 Unauthorized', 401) if (!sharing_allowed || is_top_secret)

          @sample_ids = samples.pluck(:id)
          @reaction_ids = reactions.pluck(:id)
          @wellplate_ids = wellplates.pluck(:id)
          @screen_ids = screens.pluck(:id)
          @research_plan_ids = research_plans.pluck(:id)
          @cell_line_ids = cell_lines.pluck(:id)
          @element_ids = elements&.transform_values { |v| v && v.pluck(:id) }
        end

        post do
          uids = params[:user_ids].map do |user_id|
            val = user_id[:value].to_s.downcase
            if val =~ /^[0-9]+$/
              val.to_i
            # elsif val =~ Devise::email_regexp
            else
              User.where(email: val).pluck :id
            end
          end.flatten.compact.uniq

          Usecases::Sharing::ShareWithUsers.new(
            user_ids: uids,
            sample_ids: @sample_ids,
            reaction_ids: @reaction_ids,
            wellplate_ids: @wellplate_ids,
            screen_ids: @screen_ids,
            research_plan_ids: @research_plan_ids,
            cell_line_ids: @cell_line_ids,
            element_ids: @element_ids,
            collection_attributes: params[:collection_attributes].merge(shared_by_id: current_user.id)
          ).execute!
          Message.create_msg_notification(
            channel_subject: Channel::SHARED_COLLECTION_WITH_ME,
            message_from: current_user.id, message_to: uids,
            data_args: { 'shared_by': current_user.name }, level: 'info'
          )

          {} # result is not used by FE
        end
      end

      namespace :elements do
        desc 'Move elements by UI state to another collection'
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI" do
            use :main_ui_state_params
          end
          optional :collection_id, type: Integer, desc: 'Destination collect id'
          optional :newCollection, type: String, desc: 'Label for a new collion'
          optional :is_sync_to_me, type: Boolean, desc: 'Destination collection is_sync_to_me'
        end

        put do
          to_collection_id = fetch_collection_id_for_assign(params, 4)
          error!('401 Unauthorized assignment to collection', 401) unless to_collection_id

          from_collection = fetch_source_collection_for_removal
          error!('401 Unauthorized removal from collection', 401) unless from_collection
          if (from_collection.label == 'All' && from_collection.is_locked)
            error!('401 Cannot remove elements from  \'All\' root collection', 401)
          end
          API::ELEMENTS.each do |element|
            ui_state = params[:ui_state].delete(element)
            next if ui_state.blank?

            ids = API::ELEMENT_CLASS[element].by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            collections_element_class = API::ELEMENT_CLASS[element].collections_element_class
            collections_element_class.move_to_collection(ids, from_collection.id, to_collection_id)
            collections_element_class.remove_in_collection(
              ids,
              Collection.get_all_collection_for_user(current_user.id)[:id]) if params[:is_sync_to_me]
          end

          Labimotion::ElementKlass.where(name: params[:ui_state].keys).select(:name, :id).each do |klass|
            ui_state = params[:ui_state][klass.name]
            next if ui_state.blank?

            ids = klass.elements.by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            Labimotion::CollectionsElement.move_to_collection(ids, from_collection.id, to_collection_id, klass.name)
            Labimotion::CollectionsElement.remove_in_collection(ids, Collection.get_all_collection_for_user(current_user.id)[:id]) if params[:is_sync_to_me]
          end

          status 204
        end

        desc 'Assign a collection to a set of elements by UI state'
        params do
          requires :ui_state, type: Hash, desc: 'Selected elements from the UI' do
            use :main_ui_state_params
          end
          optional :collection_id, type: Integer, desc: 'Destination collection id'
          optional :newCollection, type: String, desc: 'Label for a new collection'
          optional :is_sync_to_me, type: Boolean, desc: 'Destination collection is_sync_to_me'
        end

        post do
          from_collection = fetch_source_collection_for_assign
          error!('401 Unauthorized import from current collection', 401) unless from_collection
          to_collection_id = fetch_collection_id_for_assign(params, 4)

          error!('401 Unauthorized assignment to collection', 401) unless to_collection_id

          API::ELEMENTS.each do |element|
            ui_state = params[:ui_state].delete(element)
            next if ui_state.blank?

            ids = API::ELEMENT_CLASS[element].by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            collections_element_class = API::ELEMENT_CLASS[element].collections_element_class
            collections_element_class.create_in_collection(ids, to_collection_id)
          end

          Labimotion::ElementKlass.where(name: params[:ui_state].keys).select(:name, :id).each do |klass|
            ui_state = params[:ui_state][klass.name]
            next if ui_state.blank?

            ids = klass.elements.by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            Labimotion::CollectionsElement.create_in_collection(ids, to_collection_id)
          end

          status 204
        end

        desc "Remove from current collection a set of elements by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected elements from the UI" do
            use :main_ui_state_params
          end
        end

        delete do
          # ui_state = params[:ui_state]
          from_collection = fetch_source_collection_for_removal
          error!('401 Unauthorized removal from collection', 401) unless from_collection
          if (from_collection.label == 'All' && from_collection.is_locked)
            error!('401 Cannot remove elements from  \'All\' root collection', 401)
          end

          API::ELEMENTS.each do |element|
            ui_state = params[:ui_state].delete(element)
            next if ui_state.blank?

            ids = API::ELEMENT_CLASS[element].by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            collections_element_class = API::ELEMENT_CLASS[element].collections_element_class
            collections_element_class.remove_in_collection(ids, from_collection.id)
          end

          Labimotion::ElementKlass.where(name: params[:ui_state].keys).select(:name, :id).each do |klass|
            ui_state = params[:ui_state][klass.name]
            next if ui_state.blank?

            ids = klass.elements.by_collection_id(from_collection.id).by_ui_state(ui_state).pluck(:id)
            next if ids.empty?

            Labimotion::CollectionsElement.remove_in_collection(ids, from_collection.id)
          end

          status 204
        end
      end

      namespace :unshared do
        desc "Create an unshared collection"
        params do
          requires :label, type: String, desc: "Collection label"
        end

        post do
          Collection.create(user_id: current_user.id, label: params[:label])
          {} # result is not used by FE
        end
      end

      namespace :exports do
        desc "Create export job"
        params do
          requires :collections, type: Array[Integer]
          requires :format, type: Symbol, values: %i[json zip udm]
          requires :nested, type: Boolean
        end

        post do
          collection_ids = params[:collections].uniq
          nested = params[:nested] == true

          if collection_ids.empty?
            # no collection was given, export all collections for this user
            collection_ids = Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).pluck(:id)
          else
            # check if the user is allowed to export these collections
            collection_ids.each do |collection_id|
              collection = Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).find_by(id: collection_id)
              unless collection
                # case when collection purpose is to build the collection tree (empty and locked)
                next if Collection.find_by(id: collection_id, is_locked: true, is_shared: true)
              end
              error!('401 Unauthorized', 401) unless collection
            end
          end
          ExportCollectionsJob.perform_now(collection_ids, params[:format].to_s, nested, current_user.id)
          status 204
        end
      end

      namespace :imports do
        desc "Create import job"
        params do
          requires :file, type: File
        end
        post do
          file = params[:file]
          if tempfile = file[:tempfile]
            att = Attachment.new(
              bucket: file[:container_id],
              filename: file[:filename],
              key: File.basename(file[:tempfile].path),
              file_path: file[:tempfile],
              created_by: current_user.id,
              created_for: current_user.id,
              content_type: file[:type]
            )
            begin
              att.save!
            ensure
              tempfile.close
              tempfile.unlink
            end
            # run the asyncronous import job and return its id to the client
            ImportCollectionsJob.perform_now(att, current_user.id)
            status 204
          end
        end
      end

      namespace :tabs do
        after_validation do
          @collection = Collection.find(params[:id])
          error!('404 Collection with given id not found', 404) if @collection.nil?
          error!('401 Unauthorized', 401) unless @collection.user_id == current_user.id
        end
        desc 'insert tab segments'
        params do
          requires :id, type: Integer, desc: 'collection id'
          requires :segments, type: Hash, desc: 'orientation of the tabs'
        end
        post do
          collection = Collection.find(params[:id])
          collection.update(tabs_segment: params[:segments])
          collection
        end

        desc 'Update tab segment'
        params do
          requires :id, type: Integer, desc: 'Collection id'
          optional :segment, type: Hash, desc: 'Tab segment type'
        end

        patch do
          @collection.update(tabs_segment: params[:segment])
          status 204
        end
      end
    end
  end
end
# rubocop: enable Metrics/ClassLength, Style/MultilineIfModifier, Layout/MultilineMethodCallBraceLayout
