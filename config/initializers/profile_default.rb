# frozen_string_literal: true

# config/profile_default.yml is the single source of truth for the default
# element tab layout and the default detail-tab layouts. It is untracked and
# seeded once from the tracked .example; from then on the site administrator
# owns it, and nothing here rewrites or reconciles it.
begin
  unless File.exist?(user_config = Rails.root.join('config', 'profile_default.yml'))
    FileUtils.cp(Rails.root.join('config', 'profile_default.yml.example'), user_config)
  end

  profile_default_config = Rails.application.config_for :profile_default

  Rails.application.configure do
    config.profile_default = ActiveSupport::OrderedOptions.new
    config.profile_default.layout = profile_default_config[:layout] if profile_default_config
  end
rescue StandardError => e
  Rails.logger.error("[profile_default] #{e.class}: #{e.message}")
  # Still define the setting. Leaving it undefined makes
  # Rails.configuration.respond_to?(:profile_default) false, which callers read
  # as "no default layout" — and the profile endpoint would then persist an
  # empty layout, leaving the user with no tabs at all.
  Rails.application.configure do
    config.profile_default = ActiveSupport::OrderedOptions.new
    config.profile_default.layout = {}
  end
end

# Report drift in the administrator's copy. Purely diagnostic: the file is not
# rewritten, because the site owns its layout and may legitimately drop an
# element it does not run. Deferred to after_initialize because ::API is not
# autoloadable while initializers run.
Rails.application.config.after_initialize do
  layout = Rails.configuration.profile_default&.layout&.dig(:layout)
  next if layout.blank?

  configured = layout.keys.map(&:to_s)
  missing = API::ELEMENTS - configured
  duplicates = layout.group_by { |_k, v| v }.select { |_v, pairs| pairs.size > 1 }

  if missing.any?
    Rails.logger.warn(
      "[profile_default] config/profile_default.yml declares no position for: #{missing.join(', ')}. " \
      'Those elements will not appear in any user tab layout.',
    )
  end

  duplicates.each do |position, pairs|
    Rails.logger.warn(
      "[profile_default] config/profile_default.yml gives position #{position} to " \
      "#{pairs.map { |k, _v| k }.join(' and ')}; their relative order is unspecified.",
    )
  end
rescue StandardError => e
  Rails.logger.warn("[profile_default] could not check the layout configuration: #{e.class}: #{e.message}")
end
