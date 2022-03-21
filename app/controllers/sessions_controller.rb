# frozen_string_literal: true

class SessionsController < Devise::SessionsController
  before_action :trigger_clear_respond_to, if: -> { request.format == 'json' }

  def trigger_clear_respond_to
    clear_respond_to
  end
end
