module ContainerHelpers
  extend Grape::API::Helpers

  def update_datamodel(container)
    usecase = Usecases::Containers::UpdateDatamodel.new(current_user)
    usecase.update_datamodel(container)
  end
end # module
