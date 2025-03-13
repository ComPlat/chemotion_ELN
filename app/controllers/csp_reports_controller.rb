class CspReportsController < ApplicationController
  skip_before_action :verify_authenticity_token # Required since browsers send JSON data without CSRF tokens

  def create
    report = request.body.read
    Rails.logger.warn("CSP Violation: #{report}")

    # Optional: Save to database
    # CspViolation.create(data: report)

    head :ok
  end
end

