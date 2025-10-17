# frozen_string_literal: true

module Entities
  class UserEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: "User's unique id" }
    expose :name, documentation: { type: 'String', desc: "User's name" }
    expose :first_name, documentation: { type: 'String', desc: "User's name" }
    expose :last_name, documentation: { type: 'String', desc: "User's name" }
    expose :initials, documentation: { type: 'String', desc: 'initials' }
    expose :used_space, documentation: { type: 'Integer', desc: "User's used storage space" }
    expose :allocated_space, documentation: { type: 'Integer', desc: "User's allocated storage space (0=infinite)" }
    expose :samples_count, documentation: { type: 'Integer', desc: 'Sample count' }
    expose :reactions_count, documentation: { type: 'Integer', desc: 'Reactions count' }
    expose :cell_lines_count, documentation: { type: 'Integer', desc: 'Cellline Samples count' }
    expose :device_descriptions_count, documentation: { type: 'Integer', desc: 'Device Descriptions count' }
    expose :vessels_count, documentation: { type: 'Integer', desc: 'Vessel instances count' }
    expose :sequence_based_macromolecule_samples_count, documentation: { type: 'Integer', desc: 'Sequence-based macromolecule samples count' }
    expose :type, if: ->(obj, _opts) { obj.respond_to? :type }
    expose :reaction_name_prefix, if: ->(obj, _opts) { obj.respond_to? :reaction_name_prefix }
    expose :layout, if: ->(obj, _opts) { obj.respond_to? :layout }
    expose :email, if: ->(obj, _opts) { obj.respond_to? :email }
    expose :unconfirmed_email, if: ->(obj, _opts) { obj.respond_to? :unconfirmed_email }
    expose :confirmed_at, if: ->(obj, _opts) { obj.respond_to? :confirmed_at }
    expose :current_sign_in_at, if: ->(obj, _opts) { obj.respond_to? :current_sign_in_at }
    expose :locked_at, if: ->(obj, _opts) { obj.respond_to? :locked_at }
    expose :is_templates_moderator, documentation: { type: 'Boolean', desc: 'ketcherails template administrator' }
    expose :molecule_editor, documentation: { type: 'Boolean', desc: 'molecule administrator' }
    expose :converter_admin, documentation: { type: 'Boolean', desc: 'converter administrator' }
    expose :account_active, documentation: { type: 'Boolean', desc: 'User Account Active or Inactive' }
    expose :matrix, documentation: { type: 'Integer', desc: "User's matrix" }
    expose :counters
    expose :generic_admin, documentation: { type: 'Hash', desc: 'Generic administrator' }

    def samples_count
      object.counters['samples'].to_i
    end

    def reactions_count
      object.counters['reactions'].to_i
    end

    def cell_lines_count
      object.counters['celllines'].to_i
    end

    def device_descriptions_count
      object.counters['device_descriptions'].to_i
    end

    def vessels_count
      object.counters['vessels'].to_i
    end

    def sequence_based_macromolecule_samples_count
      object.counters['sequence_based_macromolecule_samples'].to_i
    end

    expose :current_sign_in_at do |obj|
      return nil unless obj.respond_to? :current_sign_in_at

      obj.current_sign_in_at&.strftime('%d.%m.%Y, %H:%M')
    end
  end
end
