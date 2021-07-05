# frozen_string_literal: true

# Generic condition migration
class GenericConditionMigration < ActiveRecord::Migration[4.2]
  class ElementKlass < ActiveRecord::Base
  end
  class Element < ActiveRecord::Base
  end
  class SegmentKlass < ActiveRecord::Base
  end
  class Segment < ActiveRecord::Base
  end

  def change
    ElementKlass.where(is_generic: true).each do |ek|
      pt = ek.properties_template
      layers = pt && pt['layers']
      layers&.keys&.each do |key|
        layer = layers[key] || {}
        if layer['condition'] && !layer['condition'].strip.empty?
          conds = layer['condition'].strip.split(';')
          conds.each do |cond|
            cols = cond.strip.split(',')
            next if cols.length != 3

            obj = { 'id': SecureRandom.uuid, 'layer': cols[0], 'field': cols[1], 'value': cols[2] }
            pt['layers'][key]['cond_fields'] = pt['layers'][key]['cond_fields'] || []
            pt['layers'][key]['cond_fields'].push(obj.as_json)
          end
          pt['layers'][key].delete('condition')
        end
      end
      ek.update!(properties_template: pt)
    end

    Element.find_each do |el|
      pt = el.properties
      pt.keys.each do |key|
        layer = pt[key]
        if layer['condition'] && !layer['condition'].strip.empty?
          conds = layer['condition'].strip.split(';')
          conds.each do |cond|
            cols = cond.strip.split(',')
            next if cols.length != 3

            obj = { 'id': SecureRandom.uuid, 'layer': cols[0], 'field': cols[1], 'value': cols[2] }
            pt[key]['cond_fields'] = pt[key]['cond_fields'] || []
            pt[key]['cond_fields'].push(obj.as_json)
          end
          pt[key].delete('condition')
        end
        el.update!(properties: pt)
      end
    end
    SegmentKlass.find_each do |ek|
      pt = ek.properties_template
      layers = pt && pt['layers']
      layers&.keys&.each do |key|
        layer = layers[key] || {}
        if layer['condition'] && !layer['condition'].strip.empty?
          conds = layer['condition'].strip.split(';')
          conds.each do |cond|
            cols = cond.strip.split(',')
            next if cols.length != 3

            obj = { 'id': SecureRandom.uuid, 'layer': cols[0], 'field': cols[1], 'value': cols[2] }
            pt['layers'][key]['cond_fields'] = pt['layers'][key]['cond_fields'] || []
            pt['layers'][key]['cond_fields'].push(obj.as_json)
          end
          pt['layers'][key].delete('condition')
        end
      end
      ek.update!(properties_template: pt)
    end

    Segment.find_each do |el|
      pt = el.properties
      pt.keys.each do |key|
        layer = pt[key]
        if layer['condition'] && !layer['condition'].strip.empty?
          conds = layer['condition'].strip.split(';')
          conds.each do |cond|
            cols = cond.strip.split(',')
            next if cols.length != 3

            obj = { 'id': SecureRandom.uuid, 'layer': cols[0], 'field': cols[1], 'value': cols[2] }
            pt[key]['cond_fields'] = pt[key]['cond_fields'] || []
            pt[key]['cond_fields'].push(obj.as_json)
          end
          pt[key].delete('condition')
        end
        el.update!(properties: pt)
      end
    end
  end
end
