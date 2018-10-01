module Chemotion
  class ContainerAPI < Grape::API

    resource :containers do

      desc "Remove container id of unseletced attachemnts(the attachemnts not in Inbox)"
      params do
        requires :container_id, type: Integer, desc: 'Container id'
        requires :attachments, type: Array, desc: 'Inbox attachments, the selected attachments from the UI'
      end
      after_validation do
        @container = Container.find_by id: params[:container_id]
        # Check if the current user is the container owner
        is_auth = current_user == @container.root_element
        error!('401 Unauthorized', 401) unless is_auth
      end
      patch do
        # The container(Inbox)'s attachments from the UI
        attachments = params[:attachments]
        # The container's attachments from the DB
        @container.attachments.each do |attachment|
          # if the attachment is not in Inbox, need to remove the linkage (container_id) between the container and the attachment
          if attachments.any? { |attachment_id| attachment_id[:id] == attachment.id }
            begin
              # Keep the linkage (container_id) between the container and the attachment
            end
          else
            begin
              # Remove the linkage (container_id) between the container and the attachment
              attachment.update!(attachable_id: nil)
            end
          end
        end
        status 200
      end

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
