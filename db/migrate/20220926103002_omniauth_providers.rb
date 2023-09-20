class OmniauthProviders < ActiveRecord::Migration[5.2]
    def change
      add_column :users, :providers, :jsonb, null: true unless column_exists? :users, :providers

      User.where.not(omniauth_provider: '').find_each do |u|
        next if u.omniauth_provider.blank? || u.omniauth_uid.blank?

        if u.omniauth_provider.present? && u.omniauth_uid.present?
          providers = {}
          providers[u.omniauth_provider] = u.omniauth_uid
          u.update_columns(providers: providers) if providers && providers.is_a?(Hash)
        end
      end

      remove_column :users, :omniauth_provider if column_exists? :users, :omniauth_provider
      remove_column :users, :omniauth_uid if column_exists? :users, :omniauth_uid
    end
  end
