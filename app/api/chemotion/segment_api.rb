module Chemotion
  class SegmentAPI < Grape::API
    include Grape::Kaminari

    resource :segments do
      namespace :klasses do
        desc "get segment klasses"
        params do
          optional :element, type: String, desc: "Klass Element, e.g. Sample, Reaction, Mof,..."
        end
        get do
          list = SegmentKlass.where(klass_element: params[:element], is_active: true) if params[:element].present?
          list = SegmentKlass.where(is_active: true) unless params[:element].present?
          present list.sort_by { |e| e.place }, with: Entities::SegmentKlassEntity, root: 'klass'
        end
      end
    end
  end
end
