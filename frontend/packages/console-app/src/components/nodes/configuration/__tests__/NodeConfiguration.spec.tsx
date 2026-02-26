import { render, screen, fireEvent } from '@testing-library/react';
import type { NodeKind } from '@console/dynamic-plugin-sdk/src';
import * as RouterUtils from '@console/internal/components/utils/router';
import { useQueryParams } from '@console/shared/src';
import { NodeConfiguration } from '../NodeConfiguration';

jest.mock('@console/shared/src', () => ({
  useQueryParams: jest.fn(),
}));

jest.mock('../node-storage/NodeStorage', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../NodeMachine', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('@console/internal/components/utils/router', () => ({
  ...jest.requireActual('@console/internal/components/utils/router'),
  useQueryParamsMutator: jest.fn(),
}));

const useQueryParamsMock = useQueryParams as jest.Mock;
const setQueryArgumentMock = jest.fn();

describe('NodeConfiguration', () => {
  const mockNode: NodeKind = {
    apiVersion: 'v1',
    kind: 'Node',
    metadata: {
      name: 'test-node',
      uid: 'test-uid',
    },
    spec: {},
    status: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useQueryParamsMutator
    (RouterUtils.useQueryParamsMutator as jest.Mock).mockReturnValue({
      getQueryArgument: jest.fn(),
      setQueryArgument: setQueryArgumentMock,
      setQueryArguments: jest.fn(),
      setAllQueryArguments: jest.fn(),
      removeQueryArgument: jest.fn(),
      removeQueryArguments: jest.fn(),
      setOrRemoveQueryArgument: jest.fn(),
    });
  });

  it('should render Storage tab by default', () => {
    const mockQueryParams = new URLSearchParams();
    useQueryParamsMock.mockReturnValue(mockQueryParams);

    render(<NodeConfiguration obj={mockNode} />);

    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Machine')).toBeInTheDocument();
  });

  it('should render Machine tab when activeTab query param is set', () => {
    const mockQueryParams = new URLSearchParams('activeTab=machine');
    useQueryParamsMock.mockReturnValue(mockQueryParams);

    render(<NodeConfiguration obj={mockNode} />);

    const tabs = screen.getAllByRole('tab');
    const machineTab = tabs.find((tab) => tab.textContent === 'Machine');

    expect(machineTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should update query argument when tab is clicked', () => {
    const mockQueryParams = new URLSearchParams();
    useQueryParamsMock.mockReturnValue(mockQueryParams);

    render(<NodeConfiguration obj={mockNode} />);

    const machineTab = screen.getByText('Machine');
    fireEvent.click(machineTab);

    expect(setQueryArgumentMock).toHaveBeenCalledWith('activeTab', 'machine');
  });

  it('should render vertical tabs navigation', () => {
    const mockQueryParams = new URLSearchParams();
    useQueryParamsMock.mockReturnValue(mockQueryParams);

    const { container } = render(<NodeConfiguration obj={mockNode} />);

    const tabsNav = container.querySelector('nav');
    expect(tabsNav).toBeInTheDocument();
  });

  it('should have correct data-test-id attributes', () => {
    const mockQueryParams = new URLSearchParams();
    useQueryParamsMock.mockReturnValue(mockQueryParams);

    const { container } = render(<NodeConfiguration obj={mockNode} />);

    expect(container.querySelector('[data-test-id="horizontal-link-Storage"]')).toBeInTheDocument();
    expect(container.querySelector('[data-test-id="horizontal-link-Machine"]')).toBeInTheDocument();
  });
});
