class CreateKetcher2Settings < ActiveRecord::Migration[6.1]
  def change
    create_table :ketcher2_settings do |t|
      t.string :resetToSelect
      t.integer :rotationStep
      t.boolean :showValenceWarnings
      t.boolean :atomColoring
      t.boolean :showStereoFlags
      t.string :stereoLabelStyle
      t.string :colorOfAbsoluteCenters
      t.string :colorOfAndCenters
      t.string :colorOfOrCenters
      t.string :string
      t.string :colorStereogenicCenters
      t.boolean :autoFadeOfStereoLabels
      t.string :absFlagLabel
      t.string :andFlagLabel
      t.string :mixedFlagLabel
      t.boolean :ignoreChiralFlag
      t.string :orFlagLabel
      t.string :font
      t.integer :fontsz
      t.integer :fontszsub
      t.boolean :carbonExplicitly
      t.boolean :showCharge
      t.boolean :showValence
      t.string :showHydrogenLabels
      t.boolean :aromaticCircle
      t.integer :doubleBondWidth
      t.integer :bondThickness
      t.integer :stereoBondWidth
      t.boolean :dearomatize_on_load
      t.boolean :smart_layout
      t.boolean :ignore_stereochemistry_errors
      t.boolean :mass_skip_error_on_pseudoatoms
      t.boolean :gross_formula_add_rsites
      t.boolean :gross_formula_add_isotopes
      t.boolean :showAtomIds
      t.boolean :showBondIds
      t.boolean :showHalfBondIds
      t.boolean :showLoopIds
      t.string :miewMode
      t.string :miewTheme
      t.string :miewAtomLabel
      t.boolean :init
      t.integer :user_id

      t.timestamps
    end
  end
end
