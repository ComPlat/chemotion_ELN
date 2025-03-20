# frozen_string_literal: true

class CspReportsController < ApplicationController
  skip_before_action :verify_authenticity_token

  def create
    report = request.body.read
    Rails.logger.warn("CSP Violation: #{report}")

    head :ok
  end
end
