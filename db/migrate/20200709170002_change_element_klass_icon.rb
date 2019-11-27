class ChangeElementKlassIcon < ActiveRecord::Migration
  def change
    change_column(:element_klasses, :icon_name, :string)

    mof = ElementKlass.find_by(name: 'mof')
    mof.update!(icon_name: 'fa fa-bullseye') unless mof.nil?

    cell = ElementKlass.find_by(name: 'cell')
    cell.update!(icon_name: 'fa fa-braille') unless cell.nil?
  end

end
