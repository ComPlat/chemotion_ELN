# frozen_string_literal: true

module Chemotion
  class AdminLlmAPI < Grape::API
    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      helpers do
        # Format a list of user ids into {value, label} option objects.
        def llm_users_for_ids(ids)
          return [] if ids.blank?

          User.where(id: ids).map do |u|
            { value: u.id, label: "#{u.first_name} #{u.last_name} (#{u.name_abbreviation})" }
          end
        end

        # Apply enabled/include_ids/exclude_ids changes to a named Matrice gate.
        # +attrs+ only contains the keys the admin actually supplied. Self-healing:
        # creates the gate row if it is missing so the toggle can never no-op.
        #
        # @return [Matrice, nil] the updated gate, or nil when there was nothing
        #   to apply — callers use this to decide whether to rematerialise the
        #   user matrix bitmasks.
        def update_matrice_gate(name, attrs)
          return if attrs.blank?

          matrice = Matrice.find_or_create_by(name: name)
          matrice.enabled     = attrs['enabled']     if attrs.key?('enabled')
          matrice.include_ids = attrs['include_ids'] if attrs.key?('include_ids')
          matrice.exclude_ids = attrs['exclude_ids'] if attrs.key?('exclude_ids')
          matrice.save!
          matrice
        end

        # Collect the attrs an admin actually supplied for one Matrice gate.
        # +names+ maps each gate field to the param that carries it.
        def llm_gate_attrs(declared_params, names)
          names.each_with_object({}) do |(field, param), attrs|
            attrs[field.to_s] = declared_params[param.to_s] if declared_params.key?(param.to_s)
          end
        end
      end

      # ── Access gates ─────────────────────────────────────────────────────────
      #
      # The institution's providers are a list of their own — see
      # Chemotion::AdminLlmProvidersAPI. This resource owns only who may reach
      # them, and who may bring a key of their own instead.

      namespace :llm_config do
        desc 'Return the AI access gates'
        get do
          ai_matrice          = Matrice.find_by(name: 'aiFeatures')
          custom_key_matrice  = Matrice.find_by(name: 'aiUserApiKey')
          institution_matrice = Matrice.find_by(name: 'aiGlobalProvider')

          {
            # aiFeatures gate — legacy master switch (unused)
            global_enabled: ai_matrice&.enabled || false,
            include_users: llm_users_for_ids(ai_matrice&.include_ids),
            exclude_users: llm_users_for_ids(ai_matrice&.exclude_ids),

            # aiGlobalProvider gate — may the user use the institution providers
            institution_enabled: institution_matrice&.enabled || false,
            institution_include_users: llm_users_for_ids(institution_matrice&.include_ids),
            institution_exclude_users: llm_users_for_ids(institution_matrice&.exclude_ids),

            # aiUserApiKey gate — may the user configure a personal API key
            custom_key_enabled: custom_key_matrice&.enabled || false,
            custom_key_include_users: llm_users_for_ids(custom_key_matrice&.include_ids),
            custom_key_exclude_users: llm_users_for_ids(custom_key_matrice&.exclude_ids),
          }
        end

        desc 'Update the AI access gates'
        params do
          optional :global_enabled,        type: Boolean,        desc: 'Toggle AI features globally'
          optional :include_ids,           type: Array[Integer], desc: 'User IDs explicitly allowed to use AI'
          optional :exclude_ids,           type: Array[Integer], desc: 'User IDs explicitly blocked from AI'
          optional :custom_key_enabled,    type: Boolean,        desc: 'Toggle personal-API-key permission globally'
          optional :custom_key_include_ids, type: Array[Integer], desc: 'User IDs allowed a personal API key'
          optional :custom_key_exclude_ids, type: Array[Integer], desc: 'User IDs blocked from a personal API key'
          optional :institution_enabled,    type: Boolean,        desc: 'Toggle institution-provider access globally'
          optional :institution_include_ids, type: Array[Integer], desc: 'User IDs allowed the institution providers'
          optional :institution_exclude_ids, type: Array[Integer],
                                             desc: 'User IDs blocked from the institution providers'
        end
        put do
          declared_params = declared(params, include_missing: false)

          ai_changed = update_matrice_gate(
            'aiFeatures',
            llm_gate_attrs(declared_params, enabled: :global_enabled,
                                            include_ids: :include_ids, exclude_ids: :exclude_ids),
          )
          key_changed = update_matrice_gate(
            'aiUserApiKey',
            llm_gate_attrs(declared_params, enabled: :custom_key_enabled,
                                            include_ids: :custom_key_include_ids,
                                            exclude_ids: :custom_key_exclude_ids),
          )
          inst_changed = update_matrice_gate(
            'aiGlobalProvider',
            llm_gate_attrs(declared_params, enabled: :institution_enabled,
                                            include_ids: :institution_include_ids,
                                            exclude_ids: :institution_exclude_ids),
          )

          # Rematerialise user matrix bitmasks so gate changes take effect on the
          # frontend (MatrixCheck reads the bitmask, not the Matrice directly).
          User.gen_matrix if ai_changed || key_changed || inst_changed

          { success: true }
        rescue ActiveRecord::RecordInvalid => e
          error!(e.message, 422)
        end
      end
    end
  end
end
