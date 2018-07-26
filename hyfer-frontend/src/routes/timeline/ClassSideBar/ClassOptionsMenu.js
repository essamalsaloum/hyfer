import React from 'react';
import PropTypes from 'prop-types';
import { inject, observer } from 'mobx-react';
import moment from 'moment';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ClassStartDateDialog from './ClassStartDateDialog';
import ConfirmationDialog from '../../../components/ConfirmationDialog';
import { CLASS_SELECTION_CHANGED } from '../../../stores';

@inject('timeline')
@observer
class ClassOptionsMenu extends React.Component {

  get classNumber() {
    const { group } = this.props;
    return +(group.group_name.match(/\d+/)[0]);
  }

  state = {
    classStartDateDialogOpen: false,
    selectClassDialogOpen: false,
    confirmationDialogOpen: false,
  };

  openClassStartDateDialog = () => {
    this.props.onClose();
    this.setState({ classStartDateDialogOpen: true });
  };

  closeClassStartDateDialog = () => {
    this.setState({ classStartDateDialogOpen: false });
  };

  changeStartingDate = async ({ startingDate }) => {
    const { group } = this.props;
    await this.props.timeline.updateClass(group.id, {
      starting_date: startingDate.format('YYYY-MM-DD'),
    });
    await this.props.timeline.fetchTimeline();
  }

  archiveClass = async () => {
    this.props.onClose();
    this.closeConfirmationDialog();
    const { group } = this.props;
    await this.props.timeline.updateClass(group.id, { archived: 1 });
    await this.props.timeline.fetchTimeline();
    this.props.timeline.notify(CLASS_SELECTION_CHANGED);
  }

  unarchiveClass = async () => {
    this.props.onClose();
    const { group } = this.props;
    await this.props.timeline.updateClass(group.id, { archived: 0 });
    await this.props.timeline.fetchTimeline();
    this.props.timeline.notify(CLASS_SELECTION_CHANGED);
  }

  openConfirmationDialog = () => {
    this.props.onClose();
    this.setState({ confirmationDialogOpen: true });
  }

  closeConfirmationDialog = () => {
    this.setState({ confirmationDialogOpen: false });
  }

  render() {
    const { group } = this.props;
    return (
      <React.Fragment>
        <Menu
          id="simple-menu"
          anchorEl={this.props.anchorEl}
          open={Boolean(this.props.anchorEl)}
          onClose={this.props.onClose}
        >
          {group.archived === 0 && (
            <MenuItem onClick={this.openClassStartDateDialog}>Change class starting date</MenuItem>
          )}
          {group.archived === 1 && (
            <MenuItem onClick={this.unarchiveClass}>Unarchive class {this.classNumber}</MenuItem>
          )}
          {group.archived === 0 && (
            <MenuItem onClick={this.openConfirmationDialog}>Archive class {this.classNumber}</MenuItem>
          )}
        </Menu>
        <ClassStartDateDialog
          open={this.state.classStartDateDialogOpen}
          classNumber={this.classNumber}
          startDate={moment(group.starting_date).utc()}
          title="Change starting date for class"
          prompt="Please select a new starting Sunday for the class."
          onClose={this.closeClassStartDateDialog}
          onSave={this.changeStartingDate}
        />
        <ConfirmationDialog
          open={this.state.confirmationDialogOpen}
          onOk={this.archiveClass}
          onCancel={this.closeConfirmationDialog}
          title={`Archive Class ${this.classNumber}`}
          message="Are you sure you wish to archive this class?"
        />
      </React.Fragment>
    );
  }
}

ClassOptionsMenu.wrappedComponent.propTypes = {
  anchorEl: PropTypes.object,
  group: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  timeline: PropTypes.object.isRequired,
};

export default ClassOptionsMenu;