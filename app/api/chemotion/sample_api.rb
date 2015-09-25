module Chemotion
  class SampleAPI < Grape::API
    include Grape::Kaminari

    resource :samples do
      # TODO more general search api
      desc "Return serialized samples of current user"
      params do
        optional :collection_id, type: Integer, desc: "Collection id"
      end
      paginate per_page: 5, max_per_page: 25, offset: 0

      get do
        scope = if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id).find(params[:collection_id]).samples.includes(:molecule)
        else
          # All collection
          Sample.joins(:collections).where('collections.user_id = ?', current_user.id).references(:collections).includes(:molecule)
        end.order("created_at DESC")

        paginate(scope)
      end

      desc "Return serialized sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Sample.find(params[:id])).read?
        end

        get do
          Sample.find(params[:id])
        end
      end

      desc "Update sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
        requires :name, type: String, desc: "Sample name"
        requires :amount_value, type: Float, desc: "Sample amount_value"
        requires :amount_unit, type: String, desc: "Sample amount_unit"
        requires :description, type: String, desc: "Sample description"
        requires :purity, type: Float, desc: "Sample purity"
        requires :solvent, type: String, desc: "Sample solvent"
        requires :impurities, type: String, desc: "Sample impurities"
        requires :location, type: String, desc: "Sample location"
        optional :molfile, type: String, desc: "Sample molfile"
        optional :molecule, type: Hash, desc: "Sample molecule"
        requires :is_top_secret, type: Boolean, desc: "Sample is marked as top secret?"
      end
      route_param :id do
        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(@current_user, Sample.find(params[:id])).update?
        end

        put do
          attributes = {
            name: params[:name],
            amount_value: params[:amount_value],
            amount_unit: params[:amount_unit],
            description: params[:description],
            purity: params[:purity],
            solvent: params[:solvent],
            impurities: params[:impurities],
            location: params[:location],
            molfile: params[:molfile],
            is_top_secret: params[:is_top_secret]
          }

          attributes.merge!(
            molecule_attributes: params[:molecule]
          ) unless params[:molecule].blank?

          Sample.find(params[:id]).update(attributes)
        end
      end

      desc "Create a sample"
      params do
        requires :name, type: String, desc: "Sample name"
        requires :amount_value, type: Float, desc: "Sample amount_value"
        requires :amount_unit, type: String, desc: "Sample amount_unit"
        requires :description, type: String, desc: "Sample description"
        requires :purity, type: Float, desc: "Sample purity"
        requires :solvent, type: String, desc: "Sample solvent"
        requires :impurities, type: String, desc: "Sample impurities"
        requires :location, type: String, desc: "Sample location"
        optional :molfile, type: String, desc: "Sample molfile"
        optional :molecule, type: Hash, desc: "Sample molecule"
        optional :collection_id, type: Integer, desc: "Collection id"
        requires :is_top_secret, type: Boolean, desc: "Sample is marked as top secret?"
      end
      post do
        attributes = {
          name: params[:name],
          amount_value: params[:amount_value],
          amount_unit: params[:amount_unit],
          description: params[:description],
          purity: params[:purity],
          solvent: params[:solvent],
          impurities: params[:impurities],
          location: params[:location],
          molfile: params[:molfile],
          is_top_secret: params[:is_top_secret]
        }
        attributes.merge!(
          molecule_attributes: params[:molecule]
        ) unless params[:molecule].blank?
        sample = Sample.create(attributes)
        if collection_id = params[:collection_id]
          collection = Collection.find(collection_id)
          CollectionsSample.create(sample: sample, collection: collection)
        end
        sample
      end

      desc "Delete a sample by id"
      params do
        requires :id, type: Integer, desc: "Sample id"
      end
      delete do
        sample_id = params[:id]
        Sample.find(params[:id]).destroy
      end

    end
  end
end
