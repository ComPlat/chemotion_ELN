/* eslint-disable no-underscore-dangle */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

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

  const renderButtons = () => {
    const BTNS = [
      { substances: 'icon-sample' }, { reactions: 'icon-reaction' }, { references: 'fa fa-book' }, { suppliers: 'fa fa-shopping-cart' }
    ];
    if (el.type === 'reaction') { [BTNS[0], BTNS[1]] = [BTNS[1], BTNS[0]]; }
    const btn = (name, icon) => (
      <Button key={`_sfn_btn_${name}`} onClick={() => search(name)}>
        <span style={{ float: 'left' }}><i className={icon} aria-hidden="true" /></span>&nbsp;
        <span><b>{name}</b></span>
      </Button>
    );
    return BTNS.map(b => Object.entries(b).map(([key, value]) => btn(key, value)));
  };

  const popoverSettings = (
    <Popover
      className="collection-overlay"
      id="popover-layout"
      style={{ maxWidth: 'none', width: 'auto' }}
    >
      <div>
        <h3 className="popover-title">SciFinder-n Search for</h3>
        <div className="popover-content" style={{ display: 'flex', flexDirection: 'column' }}>
          {renderButtons()}
        </div>
      </div>
    </Popover>
  );

  return (
    <OverlayTrigger trigger="click" placement="left" overlay={popoverSettings} rootClose>
      <Button style={{ padding: '0px' }}>
        <div style={{ fontSize: '1.2vmin', padding: '2px', color: '#337ab7' }}><i className="fa fa-search" aria-hidden="true" />&nbsp;Search CAS</div>
      </Button>
    </OverlayTrigger>
  );
};

ScifinderSearch.propTypes = { el: PropTypes.object.isRequired };
export default ScifinderSearch;
