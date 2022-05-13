module Chemotion
  class PartnerAppAPI < Grape::API
    include Grape::Kaminari

    resource :partner_app do
      desc 'Get all partner apps'
      get do
        data = PartnerApp.all.order(:id)
        { partner_apps: data }
      end

      before do
        error!('401 Unauthorized', 401) unless current_user.is_a?(Admin)
      end
      desc 'Return Partner app by id'
      get ':id' do
        partner_app = PartnerApp.find(params[:id])
        { partner_app: partner_app }
      end

      desc 'Update new Partner app '
      params do
        requires :id, type: Integer
        requires :name, type: String, desc: 'Partner app name'
        requires :url, type: String, desc: 'Partner app url'
      end
      put ':id' do
        partner_app = PartnerApp.find(params[:id])
        partner_app.name = params[:name]
        partner_app.url = params[:url]
        partner_app.save!
      end

      desc 'Create new template'
      params do
        requires :name, type: String, desc: 'Partner app name'
        requires :url, type: String, desc: 'Partner app url'
      end
      post do
        partner_app = PartnerApp.create(
          name: params[:name],
          url: params[:url]
        )
      end

      desc 'Delete Template'
      delete ':id' do
        PartnerApp.find(params[:id]).destroy

        true
      end
    end
  end
end
