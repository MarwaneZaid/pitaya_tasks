import {
  TASK_TYPE_QUOTIDIEN,
  TASK_TYPE_ANNEXE,
  TASK_TYPE_SEMAINE,
} from '../config/constants';
import { TASK_STATUS_DONE, TASK_LIST_ALL } from '../config/opsConstants';
import {
  getTodayYmd,
  getYesterdayYmd,
  isBeforeYesterday,
  isTaskDone,
  matchesTaskListFilter,
  taskScheduledDay,
  isAssignedToMe,
} from './taskUtils';

/**
 * Filtre la liste dashboard (aujourd’hui/hier, type, poste, « Mes tâches »).
 */
export function filterDashboardTasks({
  tasks,
  filter,
  postFilter = 'all',
  listFilter = TASK_LIST_ALL,
  userName = '',
  todayYmd = getTodayYmd(),
}) {
  let list;
  const visibleTasks = (tasks || []).filter((t) => !isBeforeYesterday(t, todayYmd));

  switch (filter) {
    case 'active':
      list = visibleTasks.filter((t) => !t.completed && t.status !== TASK_STATUS_DONE);
      break;
    case 'completed':
      list = visibleTasks.filter((t) => t.completed || t.status === TASK_STATUS_DONE);
      break;
    case 'my-tasks':
      list = visibleTasks.filter((t) => isAssignedToMe(t, userName));
      break;
    case TASK_TYPE_QUOTIDIEN:
    case TASK_TYPE_ANNEXE:
    case TASK_TYPE_SEMAINE:
      list = visibleTasks.filter((t) => (t.taskType || TASK_TYPE_ANNEXE) === filter);
      break;
    default:
      list = visibleTasks.filter((t) => {
        const day = taskScheduledDay(t, todayYmd);
        const yesterdayYmd = getYesterdayYmd(todayYmd);
        if (day < yesterdayYmd) return false;
        if (day < todayYmd && isTaskDone(t)) return false;
        return true;
      });
  }

  if (postFilter !== 'all') {
    list = list.filter((t) => !t.post || t.post === postFilter || t.post === 'all');
  }
  if (listFilter !== TASK_LIST_ALL) {
    list = list.filter((t) => matchesTaskListFilter(t, listFilter));
  }
  return list;
}
