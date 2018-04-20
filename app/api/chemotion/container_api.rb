module Chemotion
  class ContainerAPI < Grape::API

    resource :containers do
      desc "Delete Container"

      after_validation do
        @container = Container.find_by id: params[:container_id]
        @element_policy = ElementPolicy.new(current_user, @container.root_element)
        error!('401 Unauthorized', 401) unless @element_policy.destroy?
      end

      delete ':container_id' do
        if current_user && current_user.container && container
          #User und Container Besitzer vergleichen
          if @container.children.length == 0 && @container.attachments.length == 0
            @container.destroy
          end
        end
        true
      end

      desc 'Update Container Content'

      after_validation do
        @container = Container.find_by id: params[:container_id]
        @element_policy = ElementPolicy.new(current_user, @container.root_element)
        error!('401 Unauthorized', 401) unless @element_policy.update?
      end

      params do
        requires :container_id, type: Integer, desc: 'Container Id'
        requires :content, type: Hash, desc: 'Container content'
      end

      put ':container_id' do
        if current_user&.container
          @container.extended_metadata['content'] = params[:content].to_json
          @container.save!
        end

        true
      end
    end
  end
end
