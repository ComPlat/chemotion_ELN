# frozen_string_literal: true

FactoryBot.define do
  factory :post_translational_modification do
    phosphorylation_enabled { false }
    phosphorylation_ser_enabled { false }
    phosphorylation_ser_details { }
    phosphorylation_thr_enabled { false }
    phosphorylation_thr_details { }
    phosphorylation_tyr_enabled { false }
    phosphorylation_tyr_details { }

    glycosylation_enabled { false }
    glycosylation_n_linked_asn_enabled { false }
    glycosylation_n_linked_asn_details { }
    glycosylation_n_linked_lys_enabled { false }
    glycosylation_n_linked_lys_details { }
    glycosylation_n_linked_ser_enabled { false }
    glycosylation_n_linked_ser_details { }
    glycosylation_n_linked_thr_enabled { false }
    glycosylation_n_linked_thr_details { }
    glycosylation_o_linked_asn_enabled { false }
    glycosylation_o_linked_asn_details { }
    glycosylation_o_linked_lys_enabled { false }
    glycosylation_o_linked_lys_details { }
    glycosylation_o_linked_ser_enabled { false }
    glycosylation_o_linked_ser_details { }
    glycosylation_o_linked_thr_enabled { false }
    glycosylation_o_linked_thr_details { }

    acetylation_enabled { false }
    acetylation_lysin_number { }

    hydroxylation_enabled { false }
    hydroxylation_lys_enabled { false }
    hydroxylation_lys_details { }
    hydroxylation_pro_enabled { false }
    hydroxylation_pro_details { }

    methylation_enabled { false }
    methylation_arg_enabled { false }
    methylation_arg_details { }
    methylation_glu_enabled { false }
    methylation_glu_details { }
    methylation_lys_enabled { false }
    methylation_lys_details { }

    other_modifications_enabled { false }
    other_modifications_details { }
    
    deleted_at { }
  end
end
