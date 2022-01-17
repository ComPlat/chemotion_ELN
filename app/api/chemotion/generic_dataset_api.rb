module Chemotion
  class GenericDatasetAPI < Grape::API
    include Grape::Kaminari

    resource :generic_dataset do
      namespace :klasses do
        desc "get dataset klasses"
        get do
          list = DatasetKlass.where(is_active: true)
          present list.sort_by(&:place), with: Entities::DatasetKlassEntity, root: 'klass'
        end
      end
    end
  end
end
