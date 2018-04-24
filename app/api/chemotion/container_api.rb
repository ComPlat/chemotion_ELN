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
        error!('401 Unauthorized', 401) unless current_user && current_user.container
          # NB: attachments are destroy through container (DJ in production)
          # NB: attachments are not paranoidized so cannot be restored)
        @container.self_and_descendants.each(&:destroy)
        status 200
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
