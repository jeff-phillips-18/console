import * as _ from 'lodash-es';
import * as moment from 'moment';
import 'patternfly/dist/js/patternfly-settings';

const { patternfly } = window;

const POD_PHASES = ["Running", "Not Ready", "Warning", "Error", "Pulling", "Pending", "Succeeded", "Terminating", "Unknown"];

const POD_COLORS = {
  Empty: patternfly.pfPaletteColors.black100,
  Running: patternfly.pfPaletteColors.lightBlue,
  "Not Ready": patternfly.pfPaletteColors.lightBlue100,
  Warning: patternfly.pfPaletteColors.orange300,
  Error: patternfly.pfPaletteColors.red200,
  Pulling: patternfly.pfPaletteColors.black300,
  Pending: patternfly.pfPaletteColors.black200,
  Succeeded: patternfly.pfPaletteColors.green,
  Terminating: patternfly.pfPaletteColors.blue500,
  Unknown: patternfly.pfPaletteColors.gold200
};

const isPodTerminating = pod => {
  return _.has(pod, 'metadata.deletionTimestamp');
};

const isPullingImage = pod => {
  if (!pod) {
    return false;
  }

  const phase = _.get(pod, 'status.phase');
  if (phase !== 'Pending') {
    return false;
  }

  const containerStatuses = _.get(pod, 'status.containerStatuses');
  if (!containerStatuses) {
    return false;
  }

  const containerPulling = function(containerStatus) {
    // TODO: Update to use the pulling reason when available. We assume
    // ContainerCreating === pulling, which might not be true.
    return _.get(containerStatus, 'state.waiting.reason') === 'ContainerCreating';
  };

  return _.some(containerStatuses, containerPulling);
};

const isContainerLooping = containerStatus => {
  return containerStatus.state.waiting && containerStatus.state.waiting.reason === 'CrashLoopBackOff';
};

const isContainerFailed = containerStatus => {
  // If this logic ever changes, update the message in podWarnings
  return containerStatus.state.terminated && containerStatus.state.terminated.exitCode !== 0;
};

const isContainerUnprepared = containerStatus => {
  if (!containerStatus.state.running ||
    containerStatus.ready !== false ||
    !containerStatus.state.running.startedAt) {
    return false;
  }

  // If this logic ever changes, update the message in podWarnings
  const fiveMinutesAgo = moment().subtract(5, 'm');
  const started = moment(containerStatus.state.running.startedAt);
  return started.isBefore(fiveMinutesAgo);
};

const podWarnings = pod => {
  let warnings = [];

  if (pod.status.phase === 'Unknown') {
    // We always show Unknown pods in a warning state
    warnings.push({reason: 'Unknown', pod: pod.metadata.name, message: 'The state of the pod could not be obtained. This is typically due to an error communicating with the host of the pod.'});
  }

  if (pod.status.phase === 'Running' && pod.status.containerStatuses) {
    _.each(pod.status.containerStatuses, containerStatus => {
      if (!containerStatus.state) {
        return false;
      }

      if (isContainerFailed(containerStatus)) {
        if (isPodTerminating(pod)) {
          warnings.push({
            severity: "error",
            reason: "NonZeroExitTerminatingPod",
            pod: pod.metadata.name,
            container: containerStatus.name,
            message: "The container " + containerStatus.name + " did not stop cleanly when terminated (exit code " + containerStatus.state.terminated.exitCode + ")."
          });
        } else {
          warnings.push({
            severity: "warning",
            reason: "NonZeroExit",
            pod: pod.metadata.name,
            container: containerStatus.name,
            message: "The container " + containerStatus.name + " failed (exit code " + containerStatus.state.terminated.exitCode + ")."
          });
        }
      }
      if (isContainerLooping(containerStatus)) {
        warnings.push({
          severity: "error",
          reason: "Looping",
          pod: pod.metadata.name,
          container: containerStatus.name,
          message: "The container " + containerStatus.name + " is crashing frequently. It must wait before it will be restarted again."
        });
      }
      if (isContainerUnprepared(containerStatus)) {
        warnings.push({
          severity: "warning",
          reason: "Unprepared",
          pod: pod.metadata.name,
          container: containerStatus.name,
          message: "The container " + containerStatus.name + " has been running for more than five minutes and has not passed its readiness check."
        });
      }
    });
  }

  return warnings.length > 0 ? warnings : null;
};

const numContainersReady = pod => {
  let numReady = 0;
  _.forEach(pod.status.containerStatuses, function(status) {
    if (status.ready) {
      numReady++;
    }
  });
  return numReady;
};

const isPodReady = pod => {
  const numReady = numContainersReady(pod);
  const total = _.size(pod.spec.containers);

  return numReady === total;
};

const getPodPhase = pod => {
  if (isPodTerminating(pod)) {
    return 'Terminating';
  }

  const warnings = podWarnings(pod);
  if (_.some(warnings, { severity: 'error' })) {
    return 'Error';
  } else if (!_.isEmpty(warnings)) {
    return 'Warning';
  }

  if (isPullingImage(pod)) {
    return 'Pulling';
  }

  // Also count running, but not ready, as its own phase.
  if (pod.status.phase === 'Running' && !isPodReady(pod)) {
    return 'Not Ready';
  }

  return _.get(pod, 'status.phase', 'Unknown');
};

const getPodCount = pods => {
  // Don't count failed pods like evicted pods
  _.reject(pods, { status: { phase: 'Failed' } });
  return _.size(pods);
};

const getPodPhases = pods => {
  let countByPhase = {};

  _.forEach(pods, pod => {
    const phase = getPodPhase(pod);
    countByPhase[phase] = (countByPhase[phase] || 0) + 1;
  });

  return countByPhase;
};

const PodUtils = {
  POD_PHASES, POD_COLORS, getPodCount, getPodPhases, getPodPhase
};

export { PodUtils, POD_PHASES, POD_COLORS, getPodCount, getPodPhases, getPodPhase };
