# frozen_string_literal: true

module ExceptionHandler
  extend ActiveSupport::Concern

  included do
    rescue_from StandardError, with: :render_internal_server_error
    rescue_from Errors::ApplicationError, with: :render_graphql_error
    rescue_from ArgumentError, with: :render_unprocessable_entity
    rescue_from Errors::AuthenticationError, with: :render_unauthorized
    rescue_from Errors::ForbiddenError, with: :render_forbidden
    rescue_from Errors::DecodeError, with: :render_unauthorized
    rescue_from Errors::ExpiredSignature, with: :render_unauthorized

    rescue_from ActiveRecord::ActiveRecordError, with: :render_graphql_error
    rescue_from ActiveModel::ValidationError, with: :render_graphql_error
    rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  end

  private

  def render_graphql_error(exception)
    render json: errors_hash(200, exception), status: :ok
  end

  def render_unauthorized(exception)
    render json: errors_hash(401, exception), status: :unauthorized
  end

  def render_forbidden(exception)
    render json: errors_hash(200, exception), status: :ok
  end

  def render_not_found(exception)
    render json: errors_hash(404, exception), status: :not_found
  end

  def render_unprocessable_entity(exception)
    render json: errors_hash(422, exception), status: :unprocessable_entity
  end

  def render_internal_server_error(exception)
    render json: errors_hash(500, exception), status: :internal_server_error
  end

  def errors_hash(status_code, exception)
    { errors: [error(status_code, exception)] }
  end

  def error(status_code, exception)
    {}.tap do |error|
      error[:status] = status_code
      error[:title] = exception.class.name.demodulize
      error[:message] = exception.message
      # error[:backtrace] = exception.backtrace if Rails.env.development?

      log_exception(exception)
    end
  end

  def log_exception(exception)
    Rails.logger.error(exception.message)
    Rails.logger.error(exception.backtrace.join("\n"))
  end
end
