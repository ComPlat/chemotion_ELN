/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import _ from 'lodash';
import Sample from 'src/models/Sample';


export default class SampleComponent extends Sample {
    constructor(props) {
        super(props);
    }

    setAmount(amount, totalVolume) {
        if (!amount.unit || isNaN(amount.value)) { return }

        if (amount.unit === 'l') {
            this.amount_value = amount.value;
            this.amount_unit = amount.unit;
            this.concn = this.amount_value * this.stock_molarity_value / totalVolume;
            this.molarity_value = this.concn;
        } else if (amount.unit === 'g') {
            this.amount_value = amount.value;
            this.amount_unit = amount.unit;
            if (totalVolume && this.amount_mol) {
                this.concn = this.amount_mol / totalVolume;
                this.molarity_value = this.concn;
            }
        }
    }

    setMolarity(amount, totalVolume, concType) {
        if (!amount.unit || isNaN(amount.value) || amount.unit !== 'mol/l') { return }

        if (concType !== 'stockConc') {
            this.concn = amount.value;
            this.molarity_value = amount.value;
            this.molarity_unit = amount.unit
        } else {
            this.stock_molarity_value = amount.value;
            this.stock_molarity_unit = amount.unit;
        }
        if (totalVolume && this.concn && this.stock_molarity_value) {
            this.amount_value = this.concn * totalVolume / this.stock_molarity_value;
            this.amount_unit = 'l';
        } else if (!this.concn && this.amount_l > 0 && this.stock_molarity_value) {
            this.concn = this.amount_l * this.stock_molarity_value / totalVolume;
            this.molarity_value = this.concn;
        } else if (this.concn === 0) {
            this.amount_value = 0;
        }
    }

    serializeComponent() {
        return {
          id: this.id,
          name: this.name,
          position: this.position,
          component_properties: {
            target_amount_value: this.target_amount_value,
            target_amount_unit: this.target_amount_unit,
            molarity_unit: this.molarity_unit,
            molarity_value: this.molarity_value,
            stock_molarity_value: this.stock_molarity_value,
            stock_molarity_unit: this.stock_molarity_unit,
            molecule_id: this.molecule.id,
            equivalent: this.equivalent,
            parent_id: this.parent_id,
          }
         }
      }
}