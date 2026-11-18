# frozen_string_literal: true

module ContainerHelpers
  extend Grape::API::Helpers

  # Labimotion passes the user as a second positional argument rather than the target element.
  # Bind its container writes to the server route, just like the native element endpoints.
  def update_datamodel(container, labimotion_user = nil, element: nil, creating: false)
    if labimotion_user
      creating = request.post?
      element = Labimotion::Element.find(params[:id]) unless creating
    end
    usecase = Usecases::Containers::UpdateDatamodel.new(current_user)
    usecase.update_datamodel(container, element: element, creating: creating)
  end
end
