# frozen_string_literal: true

# Seeds the AI access-control Matrice gates (SF-03). All use the standard Matrice
# enabled / include_ids / exclude_ids semantics and drive both the backend
# LlmProviderResolver and the frontend MatrixCheck (via config/matrices.json).
#
#   aiGlobalProvider — may the user use the institution's global provider
#   aiUserApiKey     — may the user configure a personal API key / custom endpoint
#   aiFeatures       — legacy master switch (kept for backward compatibility)
#
# aiGlobalProvider is seeded ENABLED (everyone, minus exclude_ids) so existing
# institution access is not broken; the personal-key gate is opt-in (disabled).
# A user allowed NEITHER gate has no AI access and the AI/LLM Settings section is
# hidden from their profile. Uses the real Matrice model so the callbacks fire
# and config/matrices.json + the per-user bitmasks are regenerated.
class MatriceAiGates < ActiveRecord::Migration[6.1]
  GATES = {
    'aiGlobalProvider' => {
      enabled: true,
      label:   'AI — Institution provider access',
      description: 'Controls whether users may use the institution global LLM provider ' \
                   '(configured by the admin) for AI features. When disabled, only users ' \
                   'in the Include list may use it.',
    },
    'aiUserApiKey' => {
      enabled: false,
      label:   'AI — Personal API keys',
      description: 'Controls whether users may configure their own personal API key / ' \
                   'custom endpoint in Profile → AI Settings. When disabled, users can ' \
                   'only use the institution global provider configured by the admin.',
    },
    'aiFeatures' => {
      enabled: false,
      label:   'AI / LLM Features',
      description: 'Legacy master switch for AI/LLM features. Retained for backward ' \
                   'compatibility; access is now governed by the two gates above.',
    },
  }.freeze

  def up
    GATES.each do |name, meta|
      matrice = Matrice.find_or_initialize_by(name: name)
      next if matrice.persisted? # never clobber an existing admin configuration

      matrice.update!(
        enabled:     meta[:enabled],
        label:       meta[:label],
        include_ids: [],
        exclude_ids: [],
        configs:     { description: meta[:description] },
      )
    end

    regenerate_matrix_artifacts
  end

  def down
    GATES.each_key { |name| Matrice.find_by(name: name)&.destroy }
    regenerate_matrix_artifacts
  end

  private

  # Rewrite config/matrices.json (frontend name→id map) and rematerialise every
  # user's matrix bitmask so the gates are reflected immediately.
  def regenerate_matrix_artifacts
    Matrice.gen_matrices_json if Matrice.respond_to?(:gen_matrices_json)
    User.gen_matrix if defined?(User) && User.respond_to?(:gen_matrix)
  end
end
