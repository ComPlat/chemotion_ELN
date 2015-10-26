module Chemotion
  class WellplateAPI < Grape::API
    include Grape::Kaminari

    resource :wellplates do
      namespace :ui_state do
        desc "Delete wellplates by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected wellplates from the UI" do
            requires :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Wellplate.for_user(current_user.id).for_ui_state(params[:ui_state]).destroy_all
        end
      end

      desc "Return serialized wellplates"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, max_per_page: 25, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).wellplates
        else
          # All collection of current_user
          Wellplate.joins(:collections).where('collections.user_id = ?', current_user.id).uniq
        end.order("created_at DESC")

        scope = Kaminari.paginate_array(scope.map{|s| ElementPermissionProxy.new(current_user, s).serialized})
        paginate(scope)
      end

      desc "Return serialized wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Wellplate.find(params[:id])).read?
        end

        get do
          wellplate = Wellplate.find(params[:id])
          {wellplate: ElementPermissionProxy.new(current_user, wellplate).serialized}
        end
      end

      desc "Delete a wellplate by id"
      params do
        requires :id, type: Integer, desc: "Wellplate id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Wellplate.find(params[:id])).destroy?
        end

        delete do
          Wellplate.find(params[:id]).destroy
        end
      end

      desc "Update wellplate by id"
      params do
        requires :id, type: Integer
        optional :name, type: String
        optional :size, type: Integer
        optional :description, type: String
        optional :wells, type: Array
        optional :collection_id, type: Integer
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Wellplate.find(params[:id])).update?
        end

        put do
          attributes = {
              name: params[:name],
              size: params[:size],
              description: params[:description]
          }

          ActiveRecord::Base.transaction do
            wellplate = Wellplate.find(params[:id])
            wellplate.update(attributes)
            WellplateUpdator.update_wells_for_wellplate(wellplate, params[:wells])
            wellplate.touch
            wellplate.reload
            wellplate
          end
        end
      end

      desc "Create a wellplate"
      params do
        requires :name, type: String
        optional :size, type: Integer
        optional :description, type: String
        optional :wells, type: Array
        optional :collection_id, type: Integer
      end
      post do
        attributes = {
          name: params[:name],
          size: params[:size],
          description: params[:description]
        }

        ActiveRecord::Base.transaction do
          wellplate = Wellplate.create(attributes)
          wellplate.reload
          collection = Collection.find(params[:collection_id])
          CollectionsWellplate.create(wellplate: wellplate, collection: collection)
          WellplateUpdator.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate
        end
      end

      module WellplateUpdator

        def self.update_wells_for_wellplate(wellplate, wells)
          collection_ids = wellplate.collection_ids
          current_sample_ids = wellplate.wells.pluck(:sample_id).uniq.compact
          included_sample_ids = []

          wells.each do |well|
            sample = well.sample
            sample_id = sample && sample.id

            if sample
              if sample.is_new && sample.parent_id
                parent_sample = Sample.find(sample.parent_id)

                subsample = parent_sample.dup
                subsample.parent = parent_sample
                subsample.name = sample.name

                subsample.save
                subsample.reload

                #assign subsample to all collections
                collection_ids.each do |collection_id|
                  CollectionsSample.create(sample_id: subsample.id, collection_id: collection_id)
                end

                sample_id = subsample.id
              end
              included_sample_ids << sample_id
            end


            unless well.is_new
              Well.find(well.id).update(
                  sample_id: sample_id,
                  readout: well.readout,
                  additive: well.additive,
                  position_x: well.position.x,
                  position_y: well.position.y,
              )
            else
              Well.create(
                wellplate_id: wellplate.id,
                sample_id: sample_id,
                readout: well.readout,
                additive: well.additive,
                position_x: well.position.x,
                position_y: well.position.y,
              )
            end
          end

          deleted_sample_ids = current_sample_ids - included_sample_ids
          Sample.where(id: deleted_sample_ids).destroy_all
        end
      end

      namespace :ui_state do
        desc "Delete screens by UI state"
        params do
          requires :ui_state, type: Hash, desc: "Selected screens from the UI" do
            requires :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end

        before do
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(@current_user, Screen.for_user(current_user.id).for_ui_state(params[:ui_state])).destroy?
        end

        delete do
          Screen.for_user(current_user.id).for_ui_state(params[:ui_state]).destroy_all
        end
      end

    end
  end
end
