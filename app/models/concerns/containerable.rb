# frozen_string_literal: true

# Module for tag behaviour
module Containerable
  extend ActiveSupport::Concern

  included do
    has_one :container, as: :containable, inverse_of: :containable, dependent: :nullify

    def container
      return nil unless persisted?

      asso = association(:container)
      asso.reader || (asso.target = Container.create_root_container(containable: self)) || nil
    end
  end
end
