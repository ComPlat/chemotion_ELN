# frozen_string_literal: true

module ExecutionErrorResponder
  extend ActiveSupport::Concern

  private

  def execution_error(message: nil, status: :unprocessable_entity, code: 422)
    GraphQL::ExecuteError.new(message, options: { status: status, code: code })
  end
end
