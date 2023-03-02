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

      namespace :list_dataset_klass do
        desc 'list Generic Dataset Klass'
        params do
          optional :is_active, type: Boolean, desc: 'Active or Inactive Dataset'
        end
        get do
          list = DatasetKlass.where(is_active: params[:is_active]) if params[:is_active].present?
          list = DatasetKlass.all if params[:is_active].blank?
          present list.sort_by(&:place), with: Entities::DatasetKlassEntity, root: 'klass'
        end
      end
    end
  end
end
