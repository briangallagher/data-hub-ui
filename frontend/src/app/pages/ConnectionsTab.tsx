import React from 'react';
import {
  PageSection,
  Title,
  Spinner,
  EmptyState,
  EmptyStateBody,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  Button,
  Bullseye,
  Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useConnections } from './useCatalogApi';

interface ConnectionsTabProps {
  project: string;
}

const ConnectionsTab: React.FC<ConnectionsTabProps> = ({ project }) => {
  const [filterValue, setFilterValue] = React.useState('');
  const connectionsQuery = useConnections(project);
  const connections = connectionsQuery.data || [];

  const filtered = React.useMemo(() => {
    if (!filterValue) return connections;
    const q = filterValue.toLowerCase();
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.endpoint.toLowerCase().includes(q) ||
        c.bucket.toLowerCase().includes(q),
    );
  }, [connections, filterValue]);

  return (
    <PageSection>
      <Title headingLevel="h2" size="xl" style={{ marginBottom: '16px' }}>
        Data connections
      </Title>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem variant="search-filter">
            <SearchInput
              placeholder="Filter connections..."
              value={filterValue}
              onChange={(_event, value) => setFilterValue(value)}
              onClear={() => setFilterValue('')}
            />
          </ToolbarItem>
          <ToolbarGroup align={{ default: 'alignEnd' }}>
            <ToolbarItem>
              <Button
                variant="primary"
                component="a"
                href={`/projects/${project}?section=connections`}
              >
                Create connection
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      {connectionsQuery.isLoading && (
        <Bullseye style={{ minHeight: '200px' }}>
          <Spinner />
        </Bullseye>
      )}

      {!connectionsQuery.isLoading && filtered.length === 0 && (
        <EmptyState titleText="No Data Connections found" icon={() => null}>
          <EmptyStateBody>
            {filterValue
              ? 'No connections match your filter.'
              : 'Create a Data Connection in your project to link storage credentials to catalog assets.'}
          </EmptyStateBody>
        </EmptyState>
      )}

      {!connectionsQuery.isLoading && filtered.length > 0 && (
        <Table aria-label="Connections table" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Display Name</Th>
              <Th>Type</Th>
              <Th>Namespace</Th>
              <Th>Endpoint</Th>
              <Th>Bucket</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((conn) => (
              <Tr key={`${conn.namespace}-${conn.name}`}>
                <Td dataLabel="Name">{conn.name}</Td>
                <Td dataLabel="Display Name">{conn.displayName}</Td>
                <Td dataLabel="Type">
                  <Label
                    isCompact
                    color={conn.connectionType === 's3' ? 'blue' : 'green'}
                  >
                    {conn.connectionType}
                  </Label>
                </Td>
                <Td dataLabel="Namespace">
                  <a href="#" style={{ color: '#06c' }}>{conn.namespace}</a>
                </Td>
                <Td dataLabel="Endpoint">{conn.endpoint || '—'}</Td>
                <Td dataLabel="Bucket">{conn.bucket || '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </PageSection>
  );
};

export default ConnectionsTab;
