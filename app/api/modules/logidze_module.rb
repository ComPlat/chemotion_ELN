# frozen_string_literal: true

# A helper to help logidize track current_user
module LogidzeModule
  extend ActiveSupport::Concern

  included do
    before do
      if current_user.present? && request.request_method.in?(%w[PATCH POST PUT DELETE])
        @logidze_meta_set ||= begin
          Logidze.with_responsible!(current_user.id)
          true
        end
      end
    end

    after do
      Logidze.clear_responsible! if @logidze_meta_set.present?
    end
  end
end