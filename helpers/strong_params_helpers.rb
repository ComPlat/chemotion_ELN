# frozen_string_literal: true

module StrongParamsHelpers
  extend Grape::API::Helpers

  def permitted_params
    @permitted_params ||= declared(params, include_missing: false, include_parent_namespaces: false)
  end
end
