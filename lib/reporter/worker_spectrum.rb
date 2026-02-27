# frozen_string_literal: true

module Reporter
  class WorkerSpectrum < Worker
    def initialize(args)
      super(args)
      @prd_atts = @report.prd_atts
    end

    private

    def substance
      @substance ||= {
        objs: contents,
      }
    end

    def contents
      product_attrs = extract_product_attrs(@objs)
      replace_att_objs(product_attrs)
      @contents ||= Spectrum::Document.new(
        objs: product_attrs,
        mol_serials: @mol_serials,
        font_family: 'Times New Roman',
      ).convert
    end

    def extract_product_attrs(objects)
      product_attrs = []
      objects&.map do |obj|
        product_attrs += extract_products_attrs(obj) if obj[:role] != 'gp'
      end
      product_attrs.compact_blank!
    end

    def extract_products_attrs(object)
      products = []
      case object[:type]
      when 'reaction'
        object[:products]&.each { |prod| products << extract_product_attr(prod) }
      when 'sample'
        products << extract_product_attr(object)
      end
      products
    end

    def extract_product_attr(object)
      target_object = {}
      target_object[:prdId] = object[:id]
      target_object[:iupac_name] = object.dig(:molecule, :iupac_name)
      target_object[:sum_formular] = object.dig(:molecule, :sum_formular)
      target_object[:molId] = object.dig(:molecule, :id)
      target_object[:showedName] = object[:showed_name]
      target_object[:atts] = extract_attributes(object)
      target_object
    end

    def extract_attributes(product) # rubocop:disable Metrics/CyclomaticComplexity
      atts = []
      product.dig(:container, :children, 0, :children)&.map do |container|
        is_report = container.dig(:extended_metadata, :report)
        return nil unless is_report

        kind = container.dig(:extended_metadata, :kind)
        container[:children]&.map do |analysis|
          analysis[:attachments]&.map do |attach|
            attach[:kind] = kind
            atts << attach
          end
        end
      end
      atts
    end

    def replace_att_objs(product_attrs) # rubocop:disable Metrics/CyclomaticComplexity
      product_attrs&.map do |prd|
        att_objs = prd[:atts]&.map do |att|
          kind = att[:kind]
          att = Attachment.find(att[:id])
          can_dwnld = if att
                        element = att.container.root.containable
                        policy = ElementPolicy.new(@author, element)
                        can_read = policy.read?
                        can_read && policy.read_dataset?
                      end
          can_dwnld ? { obj: att, kind: kind } : nil
        end
        prd[:atts] = att_objs
        prd
      end
    end
  end
end
