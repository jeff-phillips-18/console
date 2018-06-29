import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import dagre from 'dagre';

import { Vector } from '../../module/utils/vector';
import { PodUtils} from '../../module/utils/pod-utils';

/**
 * Topology View
 */
const NODE_ICON_WIDTH = 60;
const NODE_ICON_HEIGHT = 60;

const NODE_MARGIN_LEFT = 0;
const NODE_MARGIN_RIGHT = 0;
const NODE_MARGIN_TOP = 10;
const NODE_MARGIN_BOTTOM = 40;

const DEFAULT_NODE_WIDTH = NODE_ICON_WIDTH + NODE_MARGIN_LEFT + NODE_MARGIN_RIGHT;
const DEFAULT_NODE_HEIGHT = NODE_ICON_HEIGHT + NODE_MARGIN_TOP + NODE_MARGIN_BOTTOM;

const NODE_TITLE_WIDTH = 110;

const CONNECTOR_RADIUS = 8;

class Topology extends React.Component {
  constructor(props) {
    super(props);

    this.graph = new dagre.graphlib.Graph({ compound: true, nodesep: 170 });
    this.graph.setGraph({
      marginx: NODE_TITLE_WIDTH,
      marginy: 20,
      nodesep: NODE_TITLE_WIDTH + 15
    });
    this.layoutDagre(props, this.graph);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.reLayoutOnChanges) {
      this.graph = new dagre.graphlib.Graph({ compound: true });
      this.graph.setGraph({
        marginx: NODE_TITLE_WIDTH,
        marginy: 40,
        nodesep: NODE_TITLE_WIDTH
      });
    }
    this.layoutDagre(nextProps, this.graph);
  }

  getNodeGraphData = node => {
    const height = node.data.height || DEFAULT_NODE_HEIGHT;
    const width = !node.data.hidden ?
      node.data.width === undefined ? DEFAULT_NODE_WIDTH : node.data.width :
      -(NODE_TITLE_WIDTH + 15); // If hidden, remove the nodesep from being used for the node

    return {
      label: node.data.id,
      width,
      height
    };
  };

  layoutDagre = (props, graph) => {
    const { containers, nodes, edges } = props;

    containers.forEach(container => {
      container.graphData = {
        label: container.data.id,
        clusterLabelPos: container.clusterLabelPos,
        style: container.style
      };
      graph.setNode(container.data.id, container.graphData);
    });

    nodes.forEach(node => {
      node.graphData = this.getNodeGraphData(node);
      graph.setNode(node.data.id, node.graphData);
    });

    containers.forEach(container => {
      container.nodes.forEach(node => {
        node.graphData = this.getNodeGraphData(node);
        graph.setNode(node.data.id, node.graphData);
        graph.setParent(node.data.id, container.data.id);
      });
    });

    edges.forEach(edge => {
      edge.graphData = {
        label: ''
      };
      graph.setEdge(
        edge.data.source.data.id,
        edge.data.target.data.id,
        edge.graphData
      );
    });

    dagre.layout(graph);
  };

  polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = this.polarToCartesian(x, y, radius, endAngle);
    const end = this.polarToCartesian(x, y, radius, startAngle);

    const largeArcFlag = (endAngle - startAngle > 180) ? '1' : '0';

    return [
      'M',
      start.x,
      start.y,
      'A',
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y
    ].join(' ');
  };

  nodeHasServices(node) {
    return node.kind === 'DeploymentConfig' && _.size(node.services);
  }

  findIntersect(origin, radius, otherLineEndPoint) {
    let v = otherLineEndPoint.subtract(origin);
    const lineLength = v.length();

    if (lineLength === 0) {
      throw new Error("Length has to be positive");
    }

    v = v.normalize();

    return origin.add(v.multiplyScalar(radius));
  }

  getIntersectPoint(graphData, otherPoint, hasServices) {
    const centerPointX = graphData.x - (graphData.width / 2) + NODE_MARGIN_LEFT + NODE_ICON_WIDTH / 2;
    const centerPointY = graphData.y - (graphData.height / 2) + NODE_MARGIN_TOP + NODE_ICON_HEIGHT / 2;
    const origin = new Vector(centerPointX, centerPointY);
    const otherPointVector = new Vector(otherPoint.x, otherPoint.y);
    const radius = NODE_ICON_WIDTH / 2 + (hasServices ? CONNECTOR_RADIUS / 2 : 0);

    return this.findIntersect(origin, radius, otherPointVector)
  }

  getSourceNodeIntersectPoint = (node, edge) => {
    const nextPoint = edge.graphData.points[1];
    return this.getIntersectPoint(node.graphData, nextPoint, this.nodeHasServices(node));
  };

  getTargetNodeIntersectPoint = (node, edge) => {
    const lastPoint = edge.graphData.points[edge.graphData.points.length - 2];
    return this.getIntersectPoint(node.graphData, lastPoint, this.nodeHasServices(node));
  };

  getEdgeForService = service => {
    if (!service) {
      return null;
    }

    const {edges} = this.props;
    return _.find(edges, edge => edge.data.service === service);
  };

  getEdgePoints = edge => {
    const firstPoint = this.getSourceNodeIntersectPoint(edge.data.source, edge);

    // service connector is located whereever the first edge connects
    const firstEdge = this.getEdgeForService(edge.data.service) || edge;
    const lastPoint = this.getTargetNodeIntersectPoint(edge.data.target, firstEdge);

    let edgePoints = edge.graphData.points.slice(1, -1);

    let points = `${firstPoint.x},${firstPoint.y}`;
    edgePoints.forEach(point => {
       points += ` ${point.x},${point.y}`;
    });
    points += ` ${lastPoint.x},${lastPoint.y}`;

    return points;
  };

  renderEdges = edges => (
    <g className="connection">
      {edges.map(edge => {
        if (edge.data.hidden) {
          return null;
        }

        return (
          <polyline
            key={edge.data.id}
            className={`connection-line ${edge.selected ? 'selected' : ''}`}
            points={this.getEdgePoints(edge)}
            onClick={() => this.props.handleItemClick(edge)}
          />
        )
      })}
    </g>
  );

  renderNodeCircle = (node, top, left) => {
    return (
      <circle
        className="node-circle"
        r={NODE_ICON_WIDTH / 2}
        cx={left + NODE_ICON_WIDTH / 2}
        cy={top + NODE_ICON_HEIGHT / 2}
        onClick={() => {
          this.props.handleItemClick(node);
        }}
      >
        {node.data.showLabel === false && (
          <title>{node.data.title}</title>
        )}
      </circle>
    );
  };

  renderPodStatus = (node, top, left, phase, prevCount) => {
    if (!node.data.countByPhase[phase]) {
      return null;
    }

    const arcStart = 360 * (prevCount / node.data.podCount);
    const arcEnd = arcStart + (360 * (node.data.countByPhase[phase] / node.data.podCount)) - 1;

    return (
      <g key={phase}>
        <path
          className="node-circle node-donut-circle"
          style={{stroke: PodUtils.POD_COLORS[phase]}}
          d={this.describeArc(
            left + NODE_ICON_WIDTH / 2,
            top + NODE_ICON_HEIGHT / 2,
            NODE_ICON_WIDTH / 2,
            arcStart,
            arcEnd
          )}
          onClick={() => {
            this.props.handleItemClick(node);
          }}>
        </path>
        <title>{phase}</title>
      </g>
    );
  };

  renderNodeDonut = (node, top, left) => {
    if (!node.data.podCount) {
      return null;
    }

    let donuts = [];
    let countSoFar = 0;

    _.forEach(PodUtils.POD_PHASES, phase => {
      donuts.push(this.renderPodStatus(node, top, left, phase, countSoFar));
      countSoFar += node.data.countByPhase[phase];
    });

    return donuts;
  };

  renderNodeImage = (node, top, left) => {
    const { data } = node;

    return (
      <g>
        <foreignObject
          x={left}
          y={top}
          width={NODE_ICON_WIDTH}
          height={NODE_ICON_HEIGHT}
          onClick={() => {
            this.props.handleItemClick(node);
          }}
        >
          <div className="node-image-container">
            {data.image && (
              <img className="node-image" src={data.image} alt={data.id} />
            )}
            {data.iconClass && <span className={`node-icon ${data.iconClass}`} />}
            {!data.image &&
              !data.iconClass && <span className="node-title" title={data.id}>{data.id}</span>}
          </div>
        </foreignObject>
        <title>{node.data.title}</title>
      </g>
    );
  };

  renderNodeSelection = (node, top, left) => {
    if (!node.selected) {
      return null;
    }

    return (
      <circle
        className="node-selection-circle"
        r={NODE_ICON_WIDTH / 2 + (node.data.podCount ? 3 : 0)}
        cx={left + NODE_ICON_WIDTH / 2}
        cy={top + NODE_ICON_HEIGHT / 2}
      />
    );
  };

  renderNodeServices = (node, top, left) => {
    if (!this.nodeHasServices(node)) {
      return null;
    }

    let serviceComponents = [];
    _.forEach(node.services, service => {
      let centerPoint;
      const edge = this.getEdgeForService(service);
      if (edge) {
        const intersectPoint = this.getTargetNodeIntersectPoint(node, edge);
        centerPoint = {
          x: intersectPoint.x - node.graphData.x,
          y: intersectPoint.y - node.graphData.y
        }
      } else {
        centerPoint = {
          x:left + NODE_ICON_WIDTH / 2,
          y:top - (CONNECTOR_RADIUS / 2)
        };
      }

      const connector = (
        <circle
          key={service.metadata.uid}
          className="node-input-connector"
          r={CONNECTOR_RADIUS}
          cx={centerPoint.x}
          cy={centerPoint.y}
          onClick={() => {
            this.props.handleItemClick(service);
          }}
        >
          <title>{_.get(service, 'metadata.name')}</title>
        </circle>
      );
      serviceComponents.push(connector);

      if (service.selected) {
        const connectorSelection = (
          <circle
            key={`${service.metadata.uid}_selected`}
            className="node-input-connector-selection"
            r={CONNECTOR_RADIUS + 1}
            cx={centerPoint.x}
            cy={centerPoint.y}
          />
        );
        serviceComponents.push(connectorSelection);
      }
    });

    return serviceComponents;
  };

  renderNodeTitle = (node, top, left) => {
    const { data, graphData } = node;

    const classes = classNames('node-title', { selected: node.selected });

    if (data.showLabel !== false) {
      return (
        <foreignObject
          x={left + NODE_ICON_WIDTH + 10}
          y={top + (NODE_ICON_HEIGHT / 2) - 10}
          width={graphData.width - (NODE_ICON_WIDTH + 10) + NODE_TITLE_WIDTH}
          height={22}
          onClick={() => {
            this.props.handleItemClick(node);
          }}
        >
          <span className={classes} title={data.title}>{data.title}</span>
        </foreignObject>
      );
    }

    return null;
  };

  renderNode = node => {
    const { data, graphData } = node;

    if (data.hidden) {
      return null;
    }

    const top = -graphData.height / 2 + NODE_MARGIN_TOP;
    const left = -graphData.width / 2 + NODE_MARGIN_LEFT;

    return (
      <g key={data.id} transform={`translate(${graphData.x}, ${graphData.y})`}>
        {this.renderNodeCircle(node, top, left)}
        {this.renderNodeDonut(node, top, left)}
        {this.renderNodeImage(node, top, left)}
        {this.renderNodeSelection(node, top, left)}
        {this.renderNodeServices(node, top, left)}
        {this.renderNodeTitle(node, top, left)}
      </g>
    );
  };

  renderNodes = (nodes, container) => (
    <g key={container ? `${container.data.id}_nodes` : 'nodes'}>
      {nodes.map(node => this.renderNode(node))}
    </g>
  );

  renderContainerTitle = container => {
    const { data, graphData } = container;

    return (
      <foreignObject
        x={-graphData.width / 2}
        y={-graphData.height / 2 + 5}
        width={graphData.width}
        height="40"
      >
        <span className="container-title">{data.title}</span>
      </foreignObject>
    );
  };

  renderContainers = containers => (
    <g>
      {containers.map(container => (
        <g
          key={container.data.id}
          transform={`translate(${container.graphData.x}, ${
            container.graphData.y
          })`}
        >
          <rect
            className="container-rect"
            ry="0"
            rx="0"
            x={-container.graphData.width / 2}
            y={-container.graphData.height / 2}
            width={container.graphData.width}
            height={container.graphData.height}
          />
          {this.renderContainerTitle(container)}
        </g>
      ))}
    </g>
  );

  renderSvg = () => {
    const { containers, nodes, edges } = this.props;

    if (!this.graph || this.graph.graph().width === Number.NEGATIVE_INFINITY) {
      return null;
    }

    return (
      <svg
        className="read-only"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: this.graph.graph().width,
          height: this.graph.graph().height,
          marginLeft: 20 - NODE_TITLE_WIDTH
        }}
      >
        {this.renderContainers(containers)}
        {this.renderEdges(edges)}
        {containers.map(container =>
          this.renderNodes(container.nodes, container)
        )}
        {this.renderNodes(nodes)}
      </svg>
    );
  };

  render() {
    const {
      className,
      allowEdgeSelection,
      handleItemClick,
      containers,
      nodes,
      edges,
      reLayoutOnChanges,
      ...props
    } = this.props;

    const topologyClasses = classNames('topology-container', className);

    return (
      <div className={topologyClasses}>
        {this.renderSvg()}
      </div>
    );
  }
}

Topology.propTypes = {
  /** Additional element css classes */
  className: PropTypes.string,
  /** Containers */
  containers: PropTypes.array,
  /** Nodes */
  nodes: PropTypes.array,
  /** Edges */
  edges: PropTypes.array,
  /** Allow edges to be selected */
  allowEdgeSelection: PropTypes.bool,
  /** Relayout graph on data change */
  reLayoutOnChanges: PropTypes.bool,
  /** Callback function(item) when item is clicked changes */
  handleItemClick: PropTypes.func
};

Topology.defaultProps = {
  className: '',
  containers: [],
  nodes: [],
  edges: [],
  allowEdgeSelection: true,
  reLayoutOnChanges: false,
  handleItemClick: null
};

export default Topology;
