module ContainerHelpers
  extend Grape::API::Helpers


  # NOTE: the second parameter is actually redundant, as the current_user gets injected as a helper in API.rb
  # Still labimotion passes the parameter and so I had to re-add it to prevent breaking specs
  def update_datamodel(container, _redundant_current_user_for_labimotion)
    usecase = Usecases::Containers::UpdateDatamodel.new(current_user)
    usecase.update_datamodel(container)
  end
end # module
