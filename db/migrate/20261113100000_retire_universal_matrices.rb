# frozen_string_literal: true

# Decoupled samples and the Ketcher editor are available to every user, so their
# matrices are no longer needed. userLabel was retired earlier, but instances that
# ran 20240530000001 before it switched to a hard delete still have it soft-deleted.
#
# Hard delete: generate_users_matrix v02 does not skip soft-deleted rows, and the
# update_users_matrix trigger does not fire on DELETE, so the masks are regenerated here.
class RetireUniversalMatrices < ActiveRecord::Migration[6.1]
  RETIRED = %w[sampleDecoupled ketcherEditor userLabel].freeze

  RESTORED = {
    'sampleDecoupled' => {},
    'ketcherEditor' => { editor: 'ketcher' },
  }.freeze

  def up
    names = RETIRED.map { |name| connection.quote(name) }.join(', ')
    execute("DELETE FROM matrices WHERE name IN (#{names})")
    User.gen_matrix
    Matrice.gen_matrices_json
  end

  def down
    RESTORED.each do |name, configs|
      next if Matrice.unscoped.exists?(name: name)

      Matrice.create!(name: name, label: name, enabled: true, configs: configs)
    end
    Matrice.gen_matrices_json
  end
end
