import { observable, action, computed, runInAction } from 'mobx';
import moment from 'moment';
import { fetchJSON } from './util';
import stores from '.';

function addModuleDates(timelineItems) {
  const groupNames = Object.keys(timelineItems);
  return groupNames.reduce((acc, groupName) => {
    const groupInfo = timelineItems[groupName];
    let starting_date = moment.utc(groupInfo.starting_date);
    const modules = groupInfo.modules.map((module) => {
      if (starting_date.day() !== 0) {
        starting_date.weekday(0);
      }
      const nextStarting = moment(starting_date).add(module.duration, 'weeks');
      const newModule = {
        ...module,
        starting_date,
        ending_date: moment(nextStarting).subtract(1, 'days'),
      };
      starting_date = moment(nextStarting);
      return newModule;
    });

    groupInfo.modules = modules;

    acc[groupName] = {
      group_id: groupInfo.group_id,
      starting_date: groupInfo.starting_date,
      modules,
    };
    return acc;
  }, {});
}

export default class TimeLineStore {

  @observable
  timeline = null;

  @observable
  items = null;

  @observable
  filter = 'active';

  @observable
  groups = null;

  @computed
  get activeGroups() {
    return this.groups.filter(group => group.archived === 0);
  }

  @computed
  get selectedGroups() {
    return this.filter === 'active'
      ? this.activeGroups
      : this.groups.filter(group => group.group_name === this.filter);
  }

  @observable
  allSundays = null;

  @observable
  allWeeks = null;

  @action
  setFilter = (filter) => {
    if (filter !== 'add') {
      this.filter = filter;
    }
  }

  @action fetchGroups = async () => {
    if (this.groups != null) {
      return;
    }
    const groups = await fetchJSON('/api/groups');
    runInAction(() => {
      this.groups = groups;
    });
  }

  @action
  fetchTimeline = async () => {
    try {
      await this.fetchGroups();

      const queryParams = this.getQueryParams();

      const timeline = await fetchJSON(`/api/running/timeline?${queryParams}`);
      runInAction(() => {
        this.setTimelineItems(timeline);
      });
    } catch (err) {
      stores.uiStore.setLastError(err);
    }
  }

  @action
  setTimelineItems(timeline) {
    this.timeline = timeline;
    const filteredTimeline = Object.keys(this.timeline)
      .reduce((acc, key) => {
        if (this.filter === 'active' || this.filter === key) {
          acc[key] = this.timeline[key];
        }
        return acc;
      }, {});

    const items = addModuleDates(filteredTimeline);

    const allModules = Object.keys(items)
      .reduce((acc, groupName) => {
        return acc.concat(...items[groupName].modules);
      }, []);

    const firstDate = moment.min(allModules.map(module => module.starting_date));
    const lastDate = moment.max(allModules.map(module => module.ending_date));

    const allSundays = [];
    let tempDate = firstDate.clone();
    while (tempDate.day(0).isBefore(lastDate)) {
      allSundays.push(moment(tempDate));
      tempDate = tempDate.add(1, 'weeks');
    }

    const allWeeks = allSundays.reduce((acc, prevItem, index, arr) => {
      const nextItem = arr[index + 1];
      if (nextItem) {
        const oneWeek = [prevItem, nextItem];
        acc.push(oneWeek);
      }
      return acc;
    }, []);

    runInAction(() => {
      this.items = items;
      this.allSundays = allSundays;
      this.allWeeks = allWeeks;
    });
  }

  @action
  addNewClass = async (className, starting_date) => {
    const date = new Date(starting_date);
    const body = {
      group_name: className,
      starting_date: date.toISOString(),
      archived: 0,
    };
    try {
      await fetchJSON('/api/groups', 'POST', body);
    } catch (err) {
      stores.uiStore.setLastError(err);
    }
  }

  @action
  updateModule = async (item, position, duration) => {
    try {
      const queryParams = this.getQueryParams();
      const timeline = await fetchJSON(`/api/running/update/${item.group_id}/${item.position}?${queryParams}`,
        'PATCH', { position, duration });
      this.setTimelineItems(timeline);
    } catch (err) {
      stores.uiStore.setLastError(err);
    }
  }

  addModule = async (moduleId, groupId, position) => {
    try {
      const queryParams = this.getQueryParams();
      const timeline = await fetchJSON(`/api/running/add/${moduleId}/${groupId}/${position}?${queryParams}`, 'PATCH');
      this.setTimelineItems(timeline);
    } catch (error) {
      stores.uiStore.setLastError(error);
    }
  }

  @action
  removeModule = async (groupId, position) => {
    try {
      const queryParams = this.getQueryParams();
      const timeline = await fetchJSON(`/api/running/${groupId}/${position}?${queryParams}`, 'DELETE');
      this.setTimelineItems(timeline);
    } catch (error) {
      stores.uiStore.setLastError(error);
    }
  }

  @action
  splitModule = async (groupId, position) => {
    try {
      const queryParams = this.getQueryParams();
      const timeline = await fetchJSON(`/api/running/split/${groupId}/${position}?${queryParams}`, 'PATCH');
      this.setTimelineItems(timeline);
    } catch (error) {
      stores.uiStore.setLastError(error);
    }
  }

  getQueryParams() {
    const activeGroupNames = this.groups
      .filter(group => group.archived === 0)
      .map(group => group.group_name);
    const selectedGroups = this.filter === 'active' ? activeGroupNames : [this.filter];
    return selectedGroups.reduce((query, groupName) => {
      return query === '' ? `group=${groupName}` : `${query}&group=${groupName}`;
    }, '');
  }
}
