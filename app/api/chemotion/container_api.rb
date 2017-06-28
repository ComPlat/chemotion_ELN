module Chemotion
  class ContainerAPI < Grape::API

    resource :containers do

      desc "Delete Container"
      delete ':container_id' do
        container = Container.find_by id: params[:container_id]
        if current_user && current_user.container && container

          #User und Container Besitzer vergleichen
          if container.children.length == 0 && container.attachments.length == 0
            container.destroy
          end
        end
        true
      end

    end
  end
end
