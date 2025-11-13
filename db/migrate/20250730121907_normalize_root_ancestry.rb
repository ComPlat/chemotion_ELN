
# frozen_string_literal: true

class NormalizeRootAncestry < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!
  def up
    # Normalize existing data
    execute <<~SQL.squish
      UPDATE elements
      SET ancestry = '/' || trim(both '/' FROM ancestry) || '/'
      WHERE ancestry IS NOT NULL
        AND NOT (ancestry LIKE '/%' AND ancestry LIKE '%/');
    SQL

    execute <<~SQL.squish
      UPDATE elements
      SET ancestry = '/'
      WHERE ancestry IS NULL;
    SQL

    # Apply column changes (default, not null, collation)
    change_column :elements, :ancestry, :string, default: '/', null: false, collation: 'C'
  end

  def down
    change_column :elements, :ancestry, :string, default: nil, null: true, collation: nil

    # Restore NULL for root paths
    execute <<~SQL.squish
      UPDATE elements
      SET ancestry = NULL
      WHERE ancestry = '/';
    SQL

    # Trim slashes from all remaining values
    execute <<~SQL.squish
      UPDATE elements
      SET ancestry = trim(both '/' FROM ancestry)
      WHERE ancestry IS NOT NULL;
    SQL
  end
end
