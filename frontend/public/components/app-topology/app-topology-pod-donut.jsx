import * as _ from 'lodash-es';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import classNames from 'classnames';
import { DonutChart } from 'patternfly-react';

import { PodUtils } from '../../module/utils/pod-utils';

export class AppTopologyPodDonut extends React.Component {
  render() {
    const { id, controller, mini } = this.props;

    if (!controller) {
      return null;
    }

    const podCountByPhase = PodUtils.getPodPhases(_.get(controller, 'pods'));
    const podCount = PodUtils.getPodCount(_.get(controller, 'pods'));
    let podColumns = [];

    // We add all phases to the data, even if count 0, to force a cut-line at the top of the donut.
    _.forEach(PodUtils.POD_PHASES, phase => {
      podColumns.push([phase, podCountByPhase[phase] || 0]);
    });

    if (_.isEmpty(podCountByPhase)) {
      podColumns.push(["Empty", 1]);
    }

    const donutTitle = {
      primary: podCount,
      secondary: podCount === 1 ? 'Pod' : 'Pods'
    };

    const podData = {
      order: null,
      colors: PodUtils.POD_COLORS,
      columns: podColumns,
    };

    const donutConfig = {
      // disable hover expansion
      expand: false,
      label: {
        show: false
      },
      width: mini ? 5 : 10
    };

    const chartConfig = {
      donut: donutConfig,
      size: {
        width: mini ? 60 : 150,
        height: mini ? 60 : 150
      },
      legend: {
        show: false
      },
      transition: {
        duration: 350
      },
      selection: {
        enabled: false
      },
      tooltip: {
        format: {
          value: function(value, ratio, id) {
            // Don't show tooltips for phases with 0 count or an empty chart
            if (!value || id === "Empty") {
              return undefined;
            }

            // Show the count rather than a percentage.
            return value;
          }
        }
      }
    };

    const chartClasses = classNames('app-topology-pod-donut', { mini: mini });

    patternfly.pfSetDonutChartTitle = function (selector, primary, secondary) {
      var donutChartRightTitle = window.d3.select(selector).select('text.c3-chart-arcs-title');
      donutChartRightTitle.text("");
      donutChartRightTitle.insert('tspan').text(primary).classed('donut-title-big-pf', true).attr('dy', 0).attr('x', 0);
      donutChartRightTitle.insert('tspan').text(secondary).classed('donut-title-small-pf', true).attr('dy', 20).attr('x', 0);
    };

    return (
      <DonutChart
        id={id}
        className={chartClasses}
        data={podData}
        title={donutTitle}
        {...chartConfig}
      />
    );
  };
}

AppTopologyPodDonut.defaultProps = {
};

AppTopologyPodDonut.propTypes = {
  id: PropTypes.string.isRequired,
  controller: PropTypes.object,
  mini: PropTypes.bool
};
