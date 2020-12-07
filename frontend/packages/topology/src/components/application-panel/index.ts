export const applicationPanelSupported = () =>
  import('./getTopologyApplicationPanel' /* webpackChunkName: "topology" */).then(
    (m) => m.applicationPanelSupported,
  );

export const getTopologyApplicationPanel = () =>
  import('./getTopologyApplicationPanel' /* webpackChunkName: "topology" */).then(
    (m) => m.getTopologyApplicationPanel,
  );
