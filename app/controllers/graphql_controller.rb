# frozen_string_literal: true

class GraphqlController < ApplicationController
  skip_before_action :authenticate_user!
  # If accessing from outside this domain, nullify the session
  # This allows for outside API access while preventing CSRF attacks,
  # but you'll have to authenticate your user separately
  protect_from_forgery except: :execute

  include ExceptionHandler

  def execute
    variables = ensure_hash(params[:variables])
    query = params[:query]
    operation_name = params[:operationName]
    context = {
      current_user: current_user
    }
    result = ChemotionSchema.execute(query, variables: variables, context: context, operation_name: operation_name)
    render json: result
  end

  private

  def ensure_hash(ambiguous_param)
    return {} if ambiguous_param.nil?

    case ambiguous_param
    when String
      ambiguous_param.present? ? ensure_hash(JSON.parse(ambiguous_param)) : {}
    when Hash, ActionController::Parameters
      ambiguous_param
    else
      raise ArgumentError, "Unexpected parameter: #{ambiguous_param}"
    end
  end

  def current_user
    return if current_token.blank?

    @current_user ||= begin
      decoded_token = JsonWebToken.decode(current_token)
      user_id = decoded_token[:user_id]

      User.find_by!(id: user_id)
    end
  end

  def current_token
    request.headers['Authorization'].split.last if token_in_header?
  end

  def token_in_header?
    request.headers['Authorization'].present?
  end
end
