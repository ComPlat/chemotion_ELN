/* eslint-disable no-underscore-dangle */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';


const buttons = [
  {
    name: 'substances',
    icon: 'icon-sample'
  },
  {
    name: 'reactions',
    icon: 'icon-reaction' },
  {
    name: 'references',
    icon: 'fa fa-book' },
  {
    name: 'suppliers',
    icon: 'fa fa-shopping-cart'
  }
];

const notify = (params) => {
  NotificationActions.add({
    title: params.title, message: params.msg, level: params.lvl, position: 'tc', dismissible: 'button', uid: uuid.v4()
  });
};

const buildRxn = (reaction) => {
  let rxn = '$RXN\n\n\n\n';
  const molBreak = '$MOL\n';
  let rl = 0;
  let xl = 0;
  let pl = 0;
  let molfiles = '';
  reaction._starting_materials.map((e) => {
    rl += 1;
    molfiles += molBreak + e.molfile.slice(0, e.molfile.lastIndexOf('$$$$'));
  });
  reaction._reactants.map((e) => {
    xl += 1;
    molfiles += molBreak + e.molfile.slice(0, e.molfile.lastIndexOf('$$$$'));
  });
  reaction._products.map((e) => {
    pl += 1;
    molfiles += molBreak + e.molfile.slice(0, e.molfile.lastIndexOf('$$$$'));
  });
  rxn += (`   ${(rl + xl).toString()}`).slice(-3);
  rxn += (`   ${pl.toString()}`).slice(-3);
  rxn += '\n';
  rxn += molfiles;
  return { rxn };
};

const ScifinderSearch = (props) => {
  const { el } = props;
  const search = (_type) => {
    const str = el.type === 'reaction' ? buildRxn(el).rxn : el.molfile;
    const params = { str, search: _type, ctype: 'x-mdl-rxnfile' };
    LoadingActions.start();
    MoleculesFetcher.fetchSciFinder(params)
      .then((result) => {
        if (result.errors.length === 0) {
          const url = `${result.host}${result.path}`;
          window.open(url, '_blank');
        } else {
          notify({ title: 'SciFinder-n Error', lvl: 'error', msg: result.errors[0] });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
        notify({ title: 'SciFinder-n Error', lvl: 'error', msg: errorMessage });
      }).finally(() => LoadingActions.stop());
  };

  const popover = (
    <Popover className="scrollable-popover" id="scifinder-popover">
      <Popover.Header as="h3">SciFinder-n Search for</Popover.Header>
        <Popover.Body className='d-flex flex-column gap-1'>
          {buttons.map((button) => (
            <Button key={`_sfn_btn_${button.name}`} onClick={() => search(button.name)} className='text-start'>
            <i className={button.icon + ' me-1'} aria-hidden="true" />{button.name}
          </Button>
          ))}
        </Popover.Body>
    </Popover>
  );

  return (
    <OverlayTrigger trigger="click" placement="left" overlay={popover} rootClose>
      <Button className='mb-3'>
        <i className="fa fa-search me-1" aria-hidden="true" />Search CAS
      </Button>
    </OverlayTrigger>
  );
};

ScifinderSearch.propTypes = { el: PropTypes.object.isRequired };
export default ScifinderSearch;
