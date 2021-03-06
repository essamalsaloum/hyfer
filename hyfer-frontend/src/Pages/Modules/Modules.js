import React, { Component } from 'react';
import ModuleHeader from './ModuleHeader';
import ModuleList from './ModuleList';
import ModuleFooter from './ModuleFooter';
import style from '../../assets/styles/modules.css';

export default class Modules extends Component {

  render() {
    return (
      <div className={style.moduleContainer}>
        <ModuleHeader />
        <ModuleList />
        <ModuleFooter />
        <div>
          <p>* Optional modules</p>
        </div>
      </div>
    );
  }
}
