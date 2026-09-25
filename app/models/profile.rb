# == Schema Information
#
# Table name: profiles
#
#  id                      :integer          not null, primary key
#  show_external_name      :boolean          default(FALSE)
#  user_id                 :integer          not null
#  deleted_at              :datetime
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  data                    :jsonb            not null
#  curation                :integer          default(2)
#  show_sample_name        :boolean          default(FALSE)
#  show_sample_short_label :boolean          default(FALSE)
#
# Indexes
#
#  index_profiles_on_deleted_at  (deleted_at)
#  index_profiles_on_user_id     (user_id)
#

class Profile < ApplicationRecord
  acts_as_paranoid

  belongs_to :user

  before_create :set_default

  scope :novnc, -> { where("\"data\"->>'novnc' is distinct from null") }

  def computed_props
    data&.dig('computed_props')
  end

  def enable_computed_props
    if data.nil?
      self.data = { computed_props: { enable: true } }
    else
      data['computed_props'] = {} if data['computed_props'].nil?
      data['computed_props']['enable'] = true
    end

    save!
  end

  def disabled_computed_props
    if data.nil?
      self.data = { computed_props: { enable: false } }
    else
      data['computed_props'] = {} if data['computed_props'].nil?
      data['computed_props']['enable'] = false
    end

    save!
  end

  # Default element tab layout configured for this instance, string-keyed.
  #
  # +config/profile_default.yml+ is the single source of truth for the layout,
  # so this is the only place the values are read. The returned hash is a deep
  # copy: +Rails.configuration.profile_default.layout+ is built once at boot and
  # shared by every request, and handing out a reference into it lets a caller
  # corrupt process-wide state.
  #
  # @return [Hash{String => Integer}] empty when the configuration is absent or
  #   could not be loaded
  def self.default_layout
    return {} unless Rails.configuration.respond_to?(:profile_default)

    (Rails.configuration.profile_default&.layout&.dig(:layout) || {})
      .deep_dup
      .transform_keys(&:to_s)
  end

  private

  def set_default
    return unless user.is_a?(Person)

    data_default_chmo
    data_default_bool
    data_default_layout
  end

  def data_default_chmo
    file = Rails.root.join('db/chmo.default.profile.json')
    result = JSON.parse(File.read(file, encoding: 'bom|utf-8')) if File.file?(file)
    return if result.nil? || result['ols_terms'].nil?

    data['chmo'] = result['ols_terms']
  end

  def data_default_bool
    data['is_templates_moderator'] = false
    data['affiliation_moderator'] = false
    data['molecule_editor'] = false
    data['converter_admin'] = false
    data['inbox_auto'] = false
    data['inbox_manual'] = true
    data['global_text_template_editor'] = false
  end

  def data_default_layout
    return if data['layout'].present?

    defaults = self.class.default_layout
    # Never persist a blank layout — that would leave the user with no tabs.
    return if defaults.blank?

    data['layout'] = defaults
  end
end
